import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { journeyCreatePayload } from "../lib/journeys";
import { WorkspaceMutationError, workspaceMutationError } from "../lib/mutation-errors";

describe("Journey creation revision", () => {
  const today = new Date(2026, 8, 2, 12);
  test("builds a trimmed valid payload with an explicit local start date", () => {
    expect(
      journeyCreatePayload(
        {
          title: "  Ler mais ",
          objective: "  Ler 12 livros ",
          category: "study",
          targetDate: "2026-10-01",
        },
        today,
      ),
    ).toEqual({
      title: "Ler mais",
      objective: "Ler 12 livros",
      context: null,
      category: "study",
      start_date: "2026-09-02",
      target_date: "2026-10-01",
    });
  });
  test("keeps the target date optional", () => {
    expect(
      journeyCreatePayload({ title: "Meta", objective: "Resultado", category: "custom" }, today)
        .target_date,
    ).toBeNull();
  });
  test("rejects whitespace-only fields and invalid or past dates", () => {
    expect(() =>
      journeyCreatePayload({ title: " ", objective: "Resultado", category: "custom" }, today),
    ).toThrow("JOURNEY_REQUIRED_FIELDS");
    expect(() =>
      journeyCreatePayload(
        { title: "Meta", objective: "Resultado", category: "custom", targetDate: "02/09/2026" },
        today,
      ),
    ).toThrow("JOURNEY_INVALID_DATE");
    expect(() =>
      journeyCreatePayload(
        { title: "Meta", objective: "Resultado", category: "custom", targetDate: "2026-09-01" },
        today,
      ),
    ).toThrow("JOURNEY_INVALID_DATE");
  });
  test("maps the canonical Free limit without losing the backend cause", () => {
    const backend = {
      message: "FREE_CREATION_LIMIT_REACHED",
      details: '{"resource":"journeys","limit":1}',
    };
    const error = workspaceMutationError(backend) as WorkspaceMutationError;
    expect(error.kind).toBe("free-limit");
    expect(error.message).toContain("1 Journey ativa");
    expect(error.cause).toBe(backend);
  });
  test("guards duplicate submit and invalidates list/detail status caches", () => {
    const screen = readFileSync(
      fileURLToPath(new URL("../app/(app)/journeys/index.tsx", import.meta.url)),
      "utf8",
    );
    const hooks = readFileSync(
      fileURLToPath(new URL("../hooks/use-journeys.ts", import.meta.url)),
      "utf8",
    );
    expect(screen).toContain("saving.current || mutations.create.isPending");
    expect(screen).toContain("await mutations.create.mutateAsync");
    expect(hooks).toContain("onSuccess: refresh");
    expect(hooks).toContain("queryKeys.journey(input.id)");
  });
});
