import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Edition 10 persistent action history", () => {
  it("reuses the existing owner-scoped action run table on Web", () => {
    const web = source("src/services/action-history-service.ts");
    expect(web).toContain('.from("nexora_action_runs")');
    expect(web).toContain('.eq("user_id", userId)');
    expect(web).toContain('.order("created_at", { ascending: false })');
  });

  it("reuses the same owner-scoped history on Android", () => {
    const mobile = source("mobile/services/action-history-service.ts");
    expect(mobile).toContain('.from("nexora_action_runs")');
    expect(mobile).toContain('.eq("user_id", uid)');
    expect(mobile).toContain('.order("created_at", { ascending: false })');
  });

  it("surfaces the audit trail inside existing Agents surfaces without a new route", () => {
    expect(source("src/routes/_shell.agents.tsx")).toContain("<ActionHistoryPanel />");
    expect(source("mobile/app/(app)/agents.tsx")).toContain("Histórico de ações");
  });
});
