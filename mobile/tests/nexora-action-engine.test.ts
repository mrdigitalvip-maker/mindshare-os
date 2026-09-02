import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  actionInvalidationRoots,
  actionPreview,
  actionReceipt,
  actionResultRoute,
  parseNexoraActions,
} from "../lib/nexora-actions.ts";
import { mapNexoraActionError } from "../lib/nexora-action-errors.ts";
import {
  parseNexoraModelResponse,
  parseNexoraProposal,
} from "../../supabase/functions/_shared/nexora-actions.js";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
test("proposed task creation parses safely and proposal itself does not mutate", () => {
  const proposal = {
    action_type: "create_task",
    title: "Publicar app",
    due_date: "2026-09-05",
    project_id: id,
  };
  assert.deepEqual(parseNexoraProposal(proposal), proposal);
  assert.deepEqual(
    (
      parseNexoraModelResponse({
        message: "Revise.",
        action: null,
        proposed_actions: [proposal],
      }) as {
        proposed_actions?: unknown;
      }
    )?.proposed_actions,
    [proposal],
  );
});
test("unknown actions and unsupported fields are rejected", () => {
  assert.equal(parseNexoraProposal({ action_type: "run_sql", value: "drop" }), null);
  assert.equal(parseNexoraProposal({ action_type: "create_task", title: "x", admin: true }), null);
  assert.deepEqual(parseNexoraActions([{ action_type: "run_sql" }]), []);
  assert.deepEqual(
    parseNexoraActions([{ action_type: "create_task", title: "x", admin: true }]),
    [],
  );
  assert.deepEqual(
    parseNexoraActions([{ action_type: "reschedule_task", resource_id: "not-an-id" }]),
    [],
  );
});
test("preview represents the resolved absolute date", () =>
  assert.deepEqual(
    actionPreview({ action_type: "reschedule_task", resource_id: id, due_date: "2026-09-05" }),
    { label: "Reagendar tarefa", details: ["Novo prazo: 5 de setembro"] },
  ));
test("successful actions invalidate canonical roots", () =>
  assert.deepEqual(
    actionInvalidationRoots([
      { action_type: "create_task", title: "x" },
      { action_type: "create_study_goal", title: "y", subject_id: id },
    ]).sort(),
    ["journeys", "projects", "study-overview", "study-subjects", "tasks"].sort(),
  ));
test("receipts and result routes require a server-validated resource ID", () => {
  assert.equal(actionReceipt({ action_type: "create_task", title: "x" }), "Tarefa criada.");
  assert.deepEqual(actionResultRoute({ action_type: "create_project", title: "x" }, id), {
    label: "Abrir projeto",
    href: `/projects/${id}`,
  });
  assert.equal(actionResultRoute({ action_type: "create_task", title: "x" }, "javascript:x"), null);
});
test("action failures are mapped to safe PT-BR copy", () => {
  assert.equal(mapNexoraActionError({ message: "task_stale_or_not_found" }).kind, "stale");
  assert.equal(mapNexoraActionError({ message: "project_stale_or_not_found" }).retry, false);
  assert.equal(mapNexoraActionError({ message: "unsupported_action" }).kind, "unsupported");
  assert.equal(mapNexoraActionError({ message: "free creation limit" }).kind, "free_limit");
  assert.doesNotMatch(
    mapNexoraActionError({ message: "postgres secret internals" }).message,
    /postgres/i,
  );
});
test("server enforces confirmation, ownership, staleness, canonical limits and idempotency", () => {
  const sql = readFileSync("../supabase/migrations/202608290004_nexora_action_engine.sql", "utf8");
  assert.match(sql, /p_confirmed is not true.*confirmation_required/s);
  assert.match(sql, /user_id=uid/);
  assert.match(sql, /expected is null or updated_at=expected/);
  assert.match(sql, /unique\(user_id, request_id\)/);
  assert.match(sql, /existing\.status='applied'.*idempotent/s);
  assert.match(sql, /insert into public\.tasks/);
});
test("composer clears before send, restores failures, and prevents duplicates", () => {
  const source = readFileSync("app/(app)/(tabs)/assistant-chat.tsx", "utf8");
  const clear = source.indexOf('if (!retryId) setDraft("")');
  const send = source.indexOf("await send.mutateAsync", clear);
  assert.ok(clear > 0 && send > clear);
  assert.match(source, /submitting\.current \|\| send\.isPending/);
  assert.match(source, /setDraft\(preservedDraft\)/);
});
test("native action UI requires independent confirmation and preserves retry IDs", () => {
  const source = readFileSync("app/(app)/(tabs)/assistant-chat.tsx", "utf8");
  assert.match(source, /applyingActions\.current\.has\(item\.actionId\)/);
  assert.match(source, /requestId: item\.requestId/);
  assert.match(source, /confirmed: true/);
  assert.match(source, /status: "cancelled"/);
  assert.doesNotMatch(source, /Confirmar todas|Tudo concluído/);
  assert.match(source, /proposal\.conversationId !== conversationId/);
  assert.match(source, /setProposal\(null\).*router\.replace/s);
});
test("success is server-confirmed, partial actions remain independent, and Momentum is untouched", () => {
  const source = readFileSync("app/(app)/(tabs)/assistant-chat.tsx", "utf8");
  const service = readFileSync("services/nexora-action-service.ts", "utf8");
  assert.match(service, /result\?\.status !== "applied"/);
  assert.match(source, /status: "applied"/);
  assert.match(source, /Promise\.allSettled/);
  assert.match(source, /items: current\.items\.map/);
  assert.doesNotMatch(source, /momentum/i);
});
test("attachments and quick actions cannot apply proposals", () => {
  const source = readFileSync("app/(app)/(tabs)/assistant-chat.tsx", "utf8");
  const quickActionHandler = source.slice(
    source.indexOf("ASSISTANT_QUICK_ACTIONS.map"),
    source.indexOf("renderItem="),
  );
  assert.doesNotMatch(quickActionHandler, /applyNexoraAction/);
  assert.match(quickActionHandler, /setDraft|runPicker/);
});
test("Android keyboard/composer execution contract remains intact", () => {
  const source = readFileSync("app/(app)/(tabs)/assistant-chat.tsx", "utf8");
  for (const contract of [
    "SafeAreaView",
    "KeyboardAvoidingView",
    "FlatList",
    "multiline",
    "nearBottom",
  ])
    assert.match(source, new RegExp(contract));
});
