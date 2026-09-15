import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AgentExecutionError, executeAgentRun } from "../_shared/agent-execution.ts";

type ClaimedRun = {
  run_id: string;
  agent_id: string;
  user_id: string;
  scheduled_for: string;
  prompt: string;
  notify_on_run: boolean;
};

Deno.serve(async (request) => {
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  if (!schedulerSecret || request.headers.get("x-scheduler-secret") !== schedulerSecret)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return Response.json({ ok: false, error: "configuration_error" }, { status: 500 });
  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.rpc("claim_due_agent_runs", { p_limit: 10 });
  if (error) return Response.json({ ok: false, error: "claim_failed" }, { status: 500 });

  const claimed = (data ?? []) as ClaimedRun[];
  let completed = 0;
  let failed = 0;
  let notified = 0;

  for (const run of claimed) {
    try {
      const result = await executeAgentRun({
        admin,
        userId: run.user_id,
        agentId: run.agent_id,
        input: run.prompt,
        trigger: "scheduled",
        runId: run.run_id,
      });
      completed++;
      if (run.notify_on_run) {
        const delivered = await notifyResult({
          admin,
          url,
          schedulerSecret,
          run,
          title: `${result.agentName} concluiu seu briefing`,
          message: result.output,
        });
        if (delivered) notified++;
      }
    } catch (error) {
      failed++;
      const code = error instanceof AgentExecutionError ? error.code : "provider_error";
      if (run.notify_on_run) {
        const delivered = await notifyResult({
          admin,
          url,
          schedulerSecret,
          run,
          title: "KIVRYN não concluiu o briefing",
          message:
            code === "premium_required"
              ? "Esta execução programada exige Premium ativo. O agendamento continua salvo."
              : "A execução falhou e foi registrada no histórico do Agent.",
        });
        if (delivered) notified++;
      }
    }
  }

  return Response.json({ ok: true, claimed: claimed.length, completed, failed, notified });
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
}) {
  const dedupeKey = `agent-run:${run.run_id}`;
  const deliveredOn = new Date().toISOString().slice(0, 10);
  const { error: dedupeError } = await admin.from("notification_deliveries").insert({
    user_id: run.user_id,
    dedupe_key: dedupeKey,
    kind: "general",
    delivered_on: deliveredOn,
  });
  if (dedupeError) return false;

  const safeMessage = message.trim().slice(0, 600);
  await admin.from("notifications").insert({
    user_id: run.user_id,
    type: "agent_run",
    title: title.slice(0, 120),
    message: safeMessage,
  });

  const { data: pref } = await admin
    .from("notification_preferences")
    .select("timezone,quiet_hours_start,quiet_hours_end")
    .eq("user_id", run.user_id)
    .maybeSingle();
  if (pref && insideQuietHours(pref.timezone, pref.quiet_hours_start, pref.quiet_hours_end)) return true;

  await fetch(`${url}/functions/v1/push-send`, {
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
  }).catch(() => null);
  return true;
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
