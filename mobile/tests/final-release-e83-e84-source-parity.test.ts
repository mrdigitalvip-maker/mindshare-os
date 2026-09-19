import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const freeLimits = source("../../supabase/migrations/202608270002_free_limits_and_task_invariants.sql");
const assistantQuota = source("../../supabase/migrations/202608270001_assistant_atomic_quotas.sql");
const webErrors = source("../../src/lib/mutation-errors.ts");
const mobileErrors = source("../lib/mutation-errors.ts");
const webPremium = source("../../src/routes/_shell.premium.tsx");
const mobilePremium = source("../app/(app)/premium.tsx");

describe("E83/E84 final release plan parity", () => {
  test("server owns the same Free workspace caps shown by both clients", () => {
    expect(freeLimits).toContain("resource := 'projects'; cap := 3");
    expect(freeLimits).toContain("resource := 'study_subjects'; cap := 3");
    expect(freeLimits).toContain("resource := 'journeys'; cap := 1");
    expect(freeLimits).toContain("if amount >= 30 then");
    for (const message of [
      "O plano gratuito permite até 3 projetos ativos.",
      "O plano gratuito permite até 30 tarefas em aberto.",
      "O plano gratuito permite até 3 matérias ativas.",
      "O plano gratuito permite apenas 1 Journey ativa.",
    ]) {
      expect(webErrors).toContain(message);
      expect(mobileErrors).toContain(message);
    }
  });

  test("Assistant quota copy matches the canonical server quota", () => {
    expect(assistantQuota).toContain("then 100 else 10");
    expect(assistantQuota).toContain("then 20 else 2");
    for (const screen of [webPremium, mobilePremium]) {
      expect(screen).toContain("Assistant — 10");
      expect(screen).toContain("Assistant — 100");
      expect(screen).toContain("2 image/file analyses per day");
      expect(screen).toContain("20 image/file analyses per day");
    }
  });

  test("both clients expose the same workspace and Agent plan boundary", () => {
    for (const screen of [webPremium, mobilePremium]) {
      expect(screen).toContain("Up to 3 active projects");
      expect(screen).toContain("Up to 30 open tasks");
      expect(screen).toContain("Up to 3 active study subjects");
      expect(screen).toContain("1 active Journey");
      expect(screen).toContain("Agents: creation, execution and scheduling");
    }
  });
});
