import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  createKivrynActionAuditEvent,
  type KivrynActionAuditEvent,
} from "../_shared/kivryn-action-audit.ts";
import { prepareAgenticCoreRun } from "../_shared/kivryn-agentic-core.ts";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

type ReviewBody = {
  runId?: string;
  planFingerprint?: string;
  decision?: "approve" | "reject";
  approvedStepIds?: string[];
};

function fail(request: Request, code: string, status = 400) {
  return jsonResponse(request, { ok: false, error: { code, message: "Agent action review failed." } }, status);
}

async function persistAuditEvents(
  admin: ReturnType<typeof createClient>,
  userId: string,
  agentId: string,
  events: KivrynActionAuditEvent[],
) {
  if (!events.length) return true;
  const rows = events.map((event) => ({
    user_id: userId,
    agent_id: agentId,
    run_id: event.runId,
    step_id: event.stepId,
    action_type: event.action,
    domain: event.domain,
    status: event.status,
    resource_id: event.resourceId ?? null,
    idempotent: typeof event.idempotent === "boolean" ? event.idempotent : null,
    error_code: event.errorCode ?? null,
    occurred_at: event.occurredAt,
  }));
  const { error } = await admin
    .from("agent_action_audit_events")
    .upsert(rows, {
      onConflict: "run_id,step_id,status",
      ignoreDuplicates: true,
    });
  return !error;
}

function auditForSteps(
  runId: string,
  steps: Array<{ id: string; action: any; domain: any }>,
  status: "approved" | "rejected" | "failed",
  stepIds: ReadonlySet<string>,
  extra?: { resourceId?: string; idempotent?: boolean; errorCode?: string },
) {
  return steps
    .filter((step) => stepIds.has(step.id))
    .map((step) =>
      createKivrynActionAuditEvent({
        runId,
        stepId: step.id,
        action: step.action,
        domain: step.domain,
        status,
        ...extra,
      }),
    )
    .filter((event): event is KivrynActionAuditEvent => event !== null);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;
  if (request.method !== "POST") return fail(request, "invalid_request", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return fail(request, "configuration_error", 500);

  const auth = request.headers.get("Authorization") ?? "";
  const scoped = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, serviceKey);
  const {
    data: { user },
  } = await scoped.auth.getUser();
  if (!user) return fail(request, "unauthorized", 401);

  const body = (await request.json().catch(() => null)) as ReviewBody | null;
  if (
    !body?.runId ||
    !body.planFingerprint ||
    (body.decision !== "approve" && body.decision !== "reject") ||
    (body.approvedStepIds !== undefined &&
      (!Array.isArray(body.approvedStepIds) ||
        body.approvedStepIds.some((id) => typeof id !== "string") ||
        body.approvedStepIds.length > 8))
  ) {
    return fail(request, "invalid_request");
  }

  const { data: run, error: runError } = await admin
    .from("agent_runs")
    .select(
      "id,user_id,agent_id,action_plan,action_plan_fingerprint,action_plan_status,applied_step_ids",
    )
    .eq("id", body.runId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (runError) return fail(request, "persistence_error", 500);
  if (!run) return fail(request, "resource_not_found", 404);
  if (
    run.action_plan_status !== "pending_approval" &&
    run.action_plan_status !== "partially_applied"
  ) {
    return fail(request, "plan_not_pending", 409);
  }
  if (
    typeof run.action_plan_fingerprint !== "string" ||
    run.action_plan_fingerprint !== body.planFingerprint ||
    !run.action_plan
  ) {
    return fail(request, "stale_or_forged_plan", 409);
  }

  const { data: agent, error: agentError } = await admin
    .from("agents")
    .select("id,capabilities")
    .eq("id", run.agent_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (agentError) return fail(request, "persistence_error", 500);
  if (!agent) return fail(request, "resource_not_found", 404);

  const alreadyApplied = new Set(
    Array.isArray(run.applied_step_ids)
      ? run.applied_step_ids.filter((id: unknown): id is string => typeof id === "string")
      : [],
  );

  const proposal = prepareAgenticCoreRun({
    capabilities: agent.capabilities,
    proposedPlan: run.action_plan,
    runId: run.id,
    requestId: `review_${run.id}`,
  });
  if (!proposal.ok) return fail(request, "invalid_or_unauthorized_plan", 409);

  if (!(await persistAuditEvents(admin, user.id, agent.id, proposal.audit))) {
    return fail(request, "audit_persistence_error", 500);
  }

  const allStepIds = proposal.plan.steps.map((step) => step.id);

  if (body.decision === "reject") {
    const rejectedIds = new Set(allStepIds.filter((id) => !alreadyApplied.has(id)));
    const rejectedEvents = auditForSteps(
      run.id,
      proposal.plan.steps,
      "rejected",
      rejectedIds,
    );
    if (!(await persistAuditEvents(admin, user.id, agent.id, rejectedEvents))) {
      return fail(request, "audit_persistence_error", 500);
    }

    const { error } = await admin
      .from("agent_runs")
      .update({ action_plan_status: "rejected" })
      .eq("id", run.id)
      .eq("user_id", user.id)
      .in("action_plan_status", ["pending_approval", "partially_applied"]);
    if (error) return fail(request, "persistence_error", 500);
    return jsonResponse(request, {
      ok: true,
      data: {
        runId: run.id,
        status: "rejected",
        appliedStepIds: [...alreadyApplied],
      },
    });
  }

  const requested = body.approvedStepIds?.length
    ? body.approvedStepIds.filter((id) => !alreadyApplied.has(id))
    : allStepIds.filter((id) => !alreadyApplied.has(id));
  const approvedStepIds = [...new Set(requested)];
  if (!approvedStepIds.length) return fail(request, "no_steps_selected", 400);

  const prepared = prepareAgenticCoreRun({
    capabilities: agent.capabilities,
    proposedPlan: run.action_plan,
    approval: {
      planFingerprint: body.planFingerprint,
      approvedStepIds,
      approvedAt: new Date().toISOString(),
    },
    runId: run.id,
    requestId: `review_${run.id}`,
  });
  if (!prepared.ok || !prepared.commands.length)
    return fail(request, "invalid_or_unauthorized_plan", 409);

  const commandIds = new Set(prepared.commands.map((command) => command.stepId));
  const approvedEvents = auditForSteps(
    run.id,
    prepared.plan.steps,
    "approved",
    commandIds,
  );
  if (!(await persistAuditEvents(admin, user.id, agent.id, approvedEvents))) {
    return fail(request, "audit_persistence_error", 500);
  }

  const appliedThisReview: string[] = [];
  for (const command of prepared.commands) {
    const step = prepared.plan.steps.find((candidate) => candidate.id === command.stepId);
    if (!step) return fail(request, "invalid_or_unauthorized_plan", 409);

    const { data, error } = await scoped.rpc("apply_nexora_action", {
      p_action_id: command.actionId,
      p_request_id: command.requestId,
      p_conversation_id: null,
      p_confirmed: true,
      p_action: command.action,
    });
    if (error) {
      const failed = createKivrynActionAuditEvent({
        runId: run.id,
        stepId: step.id,
        action: step.action,
        domain: step.domain,
        status: "failed",
        errorCode: "action_apply_failed",
      });
      if (failed) await persistAuditEvents(admin, user.id, agent.id, [failed]);

      const applied = [...new Set([...alreadyApplied, ...appliedThisReview])];
      await admin
        .from("agent_runs")
        .update({
          applied_step_ids: applied,
          action_plan_status: applied.length ? "partially_applied" : "pending_approval",
        })
        .eq("id", run.id)
        .eq("user_id", user.id);
      return fail(request, "action_apply_failed", 409);
    }

    const result = data as {
      status?: unknown;
      resourceId?: unknown;
      idempotent?: unknown;
    } | null;
    if (result?.status !== "applied") {
      const failed = createKivrynActionAuditEvent({
        runId: run.id,
        stepId: step.id,
        action: step.action,
        domain: step.domain,
        status: "failed",
        errorCode: "invalid_action_result",
      });
      if (failed) await persistAuditEvents(admin, user.id, agent.id, [failed]);
      return fail(request, "invalid_action_result", 500);
    }

    const appliedEvent = createKivrynActionAuditEvent({
      runId: run.id,
      stepId: step.id,
      action: step.action,
      domain: step.domain,
      status: "applied",
      ...(typeof result.resourceId === "string" ? { resourceId: result.resourceId } : {}),
      ...(typeof result.idempotent === "boolean" ? { idempotent: result.idempotent } : {}),
    });
    if (!appliedEvent || !(await persistAuditEvents(admin, user.id, agent.id, [appliedEvent]))) {
      // The workspace RPC is idempotent. Leaving this step pending lets a safe retry
      // recover the missing receipt without duplicating the workspace mutation.
      return fail(request, "audit_persistence_error", 500);
    }
    appliedThisReview.push(command.stepId);
  }

  const applied = [...new Set([...alreadyApplied, ...appliedThisReview])];
  const complete = allStepIds.length > 0 && allStepIds.every((id) => applied.includes(id));
  const nextStatus = complete ? "applied" : "partially_applied";
  const { error: updateError } = await admin
    .from("agent_runs")
    .update({ applied_step_ids: applied, action_plan_status: nextStatus })
    .eq("id", run.id)
    .eq("user_id", user.id)
    .in("action_plan_status", ["pending_approval", "partially_applied"]);
  if (updateError) return fail(request, "persistence_error", 500);

  return jsonResponse(request, {
    ok: true,
    data: {
      runId: run.id,
      status: nextStatus,
      appliedStepIds: applied,
    },
  });
});
