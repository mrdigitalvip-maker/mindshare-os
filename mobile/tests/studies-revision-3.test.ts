import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { normalizeSessionInput, normalizeSubjectInput } from "../lib/study-input";
import { uniqueSubjects } from "../lib/study-selectors";
import { workspaceMutationError } from "../lib/mutation-errors";
import type { Subject } from "../services/workspace-service";

const root = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const subject = (id: string, name = "New study plan"): Subject => ({
  id,
  name,
  description: "",
  status: "active",
  color: "#B9854B",
});

describe("Studies Revision 3 contracts", () => {
  test("subject input trims persisted fields and never fabricates a name", () => {
    expect(normalizeSubjectInput({ name: "  Matemática  ", objective: "  Álgebra  " })).toEqual({
      name: "Matemática",
      objective: "Álgebra",
      weeklyTargetMinutes: null,
    });
    expect(() => normalizeSubjectInput({ name: "   " })).toThrow("Informe o nome");
    expect(read("services/workspace-service.ts")).not.toContain('name: "New study plan"');
  });

  test.each([[1], [10080]])("accepts weekly target boundary %i", (value) =>
    expect(
      normalizeSubjectInput({ name: "A", weeklyTargetMinutes: value }).weeklyTargetMinutes,
    ).toBe(value),
  );
  test.each([[0], [1.5], [10081]])("rejects weekly target %s", (value) =>
    expect(() => normalizeSubjectInput({ name: "A", weeklyTargetMinutes: value })).toThrow(),
  );

  test("identity is the subject ID, not its persisted display name", () => {
    expect(uniqueSubjects([subject("one"), subject("two")])).toHaveLength(2);
    expect(uniqueSubjects([subject("one"), subject("one")])).toHaveLength(1);
  });

  test.each([[1], [1440]])("accepts session duration boundary %i", (value) =>
    expect(normalizeSessionInput("  capítulo 1 ", value)).toEqual({
      activity: "capítulo 1",
      plannedMinutes: value,
    }),
  );
  test.each([[0], [1.2], [1441]])("rejects session duration %s", (value) =>
    expect(() => normalizeSessionInput("atividade", value)).toThrow(),
  );
  test("rejects a blank session activity", () =>
    expect(() => normalizeSessionInput("  ", 25)).toThrow("Informe o que"));

  test("maps server limits and active-session conflicts to PT-BR", () => {
    expect(
      workspaceMutationError({
        message: "FREE_CREATION_LIMIT_REACHED",
        details: '{"resource":"study_subjects"}',
      }).message,
    ).toContain("3 matérias ativas");
    expect(
      workspaceMutationError({
        message: "duplicate",
        details: "study_sessions_one_active_per_user",
      }).message,
    ).toContain("sessão de estudo em andamento");
  });

  test("screens use synchronous guards and completion keeps server invalidations", () => {
    expect(read("app/(app)/studies/index.tsx")).toContain("savingRef.current");
    expect(read("app/(app)/studies/[subjectId]/session.tsx")).toContain("startRef.current");
    expect(read("app/(app)/studies/[subjectId]/session.tsx")).toContain("finishRef.current");
    expect(read("hooks/use-workspaces.ts")).toMatch(
      /session-finish[\s\S]*verifiedExecutionInvalidations/,
    );
    expect(read("app/(app)/studies/[subjectId]/session.tsx")).not.toMatch(
      /award.*momentum|study_xp|addPoints/i,
    );
  });

  test("backend owns active limits, session uniqueness, lifecycle and cascades", () => {
    const freeLimit = read(
      "../supabase/migrations/202608270002_free_limits_and_task_invariants.sql",
    );
    const activeStudies = read("../supabase/migrations/202608260001_active_studies.sql");
    const schema = read("../supabase/migrations/202608080001_studies_workspace.sql");
    expect(freeLimit).toMatch(/study_subjects'; cap := 3/);
    expect(freeLimit).toMatch(/status='active'/);
    expect(activeStudies).toMatch(/unique index if not exists study_sessions_one_active_per_user/);
    expect(schema).toMatch(/study_subjects\(id\) on delete cascade/);
  });
});
