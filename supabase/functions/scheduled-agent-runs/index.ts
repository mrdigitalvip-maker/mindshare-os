import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AgentExecutionError, executeAgentRun } from "../_shared/agent-execution.ts";

type ClaimedRun = {
  run_id: string;
  agent_id: string;
  user_id: string;
  scheduled_for: string | null;
  prompt: string;
  notify_on_run: boolean;
  attempt_count: number;
};

type NotificationDeliveryResult = {
  recorded: boolean;
  pushAttempted: boolean;
  pushAccepted: number;
  pushFailed: number;
  pushRequestFailed: boolean;
  quietHoursSuppressed: boolean;
};

const emptyDeliveryResult = (): NotificationDeliveryResult => ({
  recorded: false,
  pushAttempted: false,
  pushAccepted: 0,
  pushFailed: 0,
  pushRequestFailed: false,
  quietHoursSuppressed: false,
});

Deno.serve(async (request) => {
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  if (!schedulerSecret || request.headers.get("x-scheduler-secret") !== schedulerSecret)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey)
    return Response.json({ ok: false, error: "configuration_error" }, { status: 500 });
  const admin = createClient(url, serviceKey);

  const { data: enqueued, error: enqueueError } = await admin.rpc("enqueue_due_agent_runs", {
    p_limit: 20,
  });
  if (enqueueError)
    return Response.json({ ok: false, error: "enqueue_failed" }, { status: 500 });

  const { data, error } = await admin.rpc("claim_background_agent_runs", {
    p_limit: 10,
    p_stale_after: "15 minutes",
  });
  if (error) return Response.json({ ok: false, error: "claim_failed" }, { status: 500 });

  const claimed = (data ?? []) as ClaimedRun[];
  let completed = 0;
  let failed = 0;
  let retrying = 0;
  let notified = 0;
  let approvalsPending = 0;
  let pushAttempted = 0;
  let pushAccepted = 0;
  let pushFailed = 0;
  let pushRequestFailed = 0;
  let quietHoursSuppressed = 0;

  const observeDelivery = (delivery: NotificationDeliveryResult) => {
    if (delivery.recorded) notified++;
    if (delivery.pushAttempted) pushAttempted++;
    pushAccepted += delivery.pushAccepted;
    pushFailed += delivery.pushFailed;
    if (delivery.pushRequestFailed) pushRequestFailed++;
    if (delivery.quietHoursSuppressed) quietHoursSuppressed++;
  };

  for (const run of claimed) {
    try {
      const result = await executeAgentRun({
        admin,
        userId: run.user_id,
        agentId: run.agent_id,
        input: run.prompt,
        trigger: run.scheduled_for ? "scheduled" : "system",
        runId: run.run_id,
      });
      completed++;
      if (result.approvalRequired) approvalsPending++;
      if (run.notify_on_run) {
        observeDelivery(await notifyResult({
          admin,
          url,
          schedulerSecret,
          run,
          title: result.approvalRequired
            ? `${result.agentName} preparou ações para aprovação`
            : `${result.agentName} concluiu seu briefing`,
          message: result.approvalRequired
            ? `${result.output}\n\nNenhuma alteração foi aplicada. Revise e aprove o plano no KIVRYN.`
            : result.output,
        }));
      }
    } catch (error) {
      if (error instanceof AgentExecutionError && error.retryScheduled) {
        retrying++;
        continue;
      }
      failed++;
      const code = error instanceof AgentExecutionError ? error.code : "provider_error";
      if (run.notify_on_run) {
        observeDelivery(await notifyResult({
          admin,
          url,
          schedulerSecret,
          run,
          title: "KIVRYN não concluiu o briefing",
          message:
            code === "premium_required"
              ? "Esta execução programada exige Premium ativo. O agendamento continua salvo."
              : "A execução falhou após as tentativas permitidas e foi registrada no histórico do Agent.",
        }));
      }
    }
  }

  return Response.json({
    ok: true,
    enqueued: Number(enqueued) || 0,
    claimed: claimed.length,
    completed,
    approvalsPending,
    retrying,
    failed,
    notified,
    pushAttempted,
    pushAccepted,
    pushFailed,
    pushRequestFailed,
    quietHoursSuppressed,
  });
});

async function notifyResult({
  admin,
  url,
  schedulerSecret,
  run,
  title,
  message,
}: {
  admin: any;
  url: string;
  schedulerSecret: string;
  run: ClaimedRun;
  title: string;
  message: string;
}): Promise<NotificationDeliveryResult> {
  const { data: pref, error: prefError } = await admin
    .from("notification_preferences")
    .select("agents_enabled,timezone,quiet_hours_start,quiet_hours_end")
    .eq("user_id", run.user_id)
    .maybeSingle();
  if (prefError || pref?.agents_enabled === false) return emptyDeliveryResult();

  const dedupeKey = `agent-run:${run.run_id}`;
  const deliveredOn = new Date().toISOString().slice(0, 10);
  const { error: dedupeError } = await admin.from("notification_deliveries").insert({
    user_id: run.user_id,
    dedupe_key: dedupeKey,
    kind: "general",
    delivered_on: deliveredOn,
  });
  if (dedupeError) return emptyDeliveryResult();

  const safeMessage = message.trim().slice(0, 600);
  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: run.user_id,
    type: "agent_run",
    title: title.slice(0, 120),
    message: safeMessage,
  });
  if (notificationError) return emptyDeliveryResult();

  const recorded = { ...emptyDeliveryResult(), recorded: true };
  if (pref && insideQuietHours(pref.timezone, pref.quiet_hours_start, pref.quiet_hours_end)) {
    return { ...recorded, quietHoursSuppressed: true };
  }

  let pushResponse: Response;
  try {
    pushResponse = await fetch(`${url}/functions/v1/push-send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scheduler-secret": schedulerSecret,
      },
      body: JSON.stringify({
        userId: run.user_id,
        title,
        body: safeMessage.slice(0, 220),
        url: `/agents/${run.agent_id}`,
      }),
    });
  } catch {
    return { ...recorded, pushAttempted: true, pushRequestFailed: true };
  }

  if (!pushResponse.ok) {
    return { ...recorded, pushAttempted: true, pushRequestFailed: true };
  }

  try {
    const payload = await pushResponse.json() as Record<string, unknown>;
    const accepted = Math.max(0, Number(payload.accepted) || 0);
    const failed = Math.max(0, Number(payload.failed) || 0);
    return {
      ...recorded,
      pushAttempted: true,
      pushAccepted: accepted,
      pushFailed: failed,
    };
  } catch {
    return { ...recorded, pushAttempted: true, pushRequestFailed: true };
  }
}

function insideQuietHours(timezone?: string | null, start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  let local: Date;
  try {
    local = new Date(new Date().toLocaleString("en-US", { timeZone: timezone || "UTC" }));
  } catch {
    return true;
  }
  const minute = local.getHours() * 60 + local.getMinutes();
  const parse = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const from = parse(start);
  const to = parse(end);
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}
