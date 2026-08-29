import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  actionInvalidationRoots,
  actionPreview,
  parseNexoraActions,
} from "../lib/nexora-actions.ts";
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
});
test("preview represents the resolved absolute date", () =>
  assert.deepEqual(
    actionPreview({ action_type: "reschedule_task", resource_id: id, due_date: "2026-09-05" }),
    { label: "Reagendar tarefa", details: ["Data: 05/09/2026"] },
  ));
test("successful actions invalidate canonical roots", () =>
  assert.deepEqual(
    actionInvalidationRoots([
      { action_type: "create_task", title: "x" },
      { action_type: "create_study_goal", title: "y", subject_id: id },
    ]).sort(),
    ["journeys", "profile", "projects", "study-overview", "study-subjects", "tasks"].sort(),
  ));
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
