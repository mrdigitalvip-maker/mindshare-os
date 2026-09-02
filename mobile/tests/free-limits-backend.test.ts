import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { workspaceMutationError } from "../lib/mutation-errors";
const sql = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/202608270002_free_limits_and_task_invariants.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
describe("atomic Free limits", () => {
  test.each([["projects",3],["study_subjects",3],["journeys",1]])("protects %s at %i", (resource, cap) => {
    expect(sql).toContain(`resource := '${resource}'; cap := ${cap}`);
    expect(sql).toContain(":free-limit:' || resource");
    expect(sql).toContain("if public.has_premium(new.user_id) then return new");
  });
  test("protects task creation and reopening", () => {
    expect(sql).toContain("old.completed or old.user_id is distinct from new.user_id");
    expect(sql).toContain(":free-limit:tasks"); expect(sql).toContain("if amount >= 30 then");
  });
  test("covers updates and reassociation", () => {
    expect(sql.match(/before insert or update of status, user_id/g)).toHaveLength(3);
    expect(sql).toContain("before insert or update of completed, execution_status, user_id on public.tasks");
  });
});
describe("task state invariant", () => {
  test("synchronizes writes and constrains storage", () => {
    expect(sql).toContain("new.execution_status := case when new.completed then 'completed' else 'not_started' end");
    expect(sql).toContain("new.completed := new.execution_status = 'completed'");
    expect(sql).toContain("message='TASK_STATE_CONFLICT'");
    expect(sql).toContain("check (completed = (execution_status = 'completed'))");
  });
  test("maps stable backend failures", () => {
    expect(workspaceMutationError({message:"FREE_CREATION_LIMIT_REACHED",details:'{"resource":"tasks"}'}).message).toContain("30 tarefas em aberto");
    expect(workspaceMutationError({message:"TASK_STATE_CONFLICT"}).message).toContain("estado da tarefa");
  });
});
