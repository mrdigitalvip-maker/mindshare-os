import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const agentMigration = source("../../supabase/migrations/202609180012_e35_agentic_core_rls_indexes.sql");
const workspaceMigration = source("../../supabase/migrations/202609180013_e36_projects_tasks_rls_indexes.sql");
const agentRuntime = source("../services/agent-runtime-service.ts");
const backgroundRuns = source("../services/background-run-service.ts");
const workspaceService = source("../services/workspace-service.ts");

describe("E35 + E36 Agent Core and Projects/Tasks source parity", () => {
  test("Android Agent runtime still uses the canonical Agent execution and review boundaries", () => {
    expect(agentRuntime).toContain('("agent-run"');
    expect(agentRuntime).toContain('("agent-action-review"');
    expect(agentRuntime).toContain('.from("agent_runs")');
    expect(backgroundRuns).toContain('.from("agent_runs")');
    expect(agentRuntime).toContain('.eq("user_id", uid)');
    expect(backgroundRuns).toContain('.eq("user_id", auth.user.id)');
  });

  test("E35 shared backend keeps Android agent_reads owner-scoped and removes duplicate SELECT policy", () => {
    expect(agentMigration).toContain("agents_user_id_idx");
    expect(agentMigration).toContain('create policy "Owners read agent runs"');
    expect(agentMigration).toContain('(select auth.uid()) = user_id');
    expect(agentMigration).toContain('a.user_id = (select auth.uid())');
    expect(agentMigration).not.toContain("create policy runs_all");
    expect(agentMigration.toLowerCase()).not.toContain("drop index");
  });

  test("Android Projects and Tasks continue through the shared canonical tables", () => {
    expect(workspaceService).toContain('.from("projects")');
    expect(workspaceService).toContain('.from("tasks")');
    expect(workspaceService).toContain('.eq("user_id", owner(userId))');
    expect(workspaceService).toContain("assertOwnedProject");
  });

  test("E36 shared backend preserves owner and linked-project authorization for Android", () => {
    expect(workspaceMigration).toContain("projects_user_id_idx");
    expect(workspaceMigration).toContain("tasks_project_id_idx");
    expect(workspaceMigration).toContain("create policy projects_select");
    expect(workspaceMigration).toContain("create policy tasks_update");
    expect(workspaceMigration).toContain("(select auth.uid()) = user_id");
    expect(workspaceMigration).toContain("p.user_id = (select auth.uid())");
    expect(workspaceMigration.toLowerCase()).not.toContain("drop index");
  });
});
