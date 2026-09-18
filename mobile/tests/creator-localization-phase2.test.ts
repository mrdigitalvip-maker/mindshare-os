import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const creatorNew = source("../app/(app)/creator/new.tsx");
const profile = source("../app/(app)/creator/profile.tsx");
const strategy = source("../app/(app)/creator/strategy.tsx");
const analytics = source("../app/(app)/creator/analytics.tsx");
const academy = source("../app/(app)/creator/academy/index.tsx");

describe("Phase 2 Creator localization parity", () => {
  test("new Creator source flow carries explicit pt-BR and en copy", () => {
    expect(creatorNew).toContain('"pt-BR": {');
    expect(creatorNew).toContain("en: {");
    expect(creatorNew).toContain("const { resolvedLocale } = useLanguage()");
    expect(creatorNew).toContain('language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR"');
    expect(creatorNew).toContain("A KIVRYN não baixa vídeos arbitrariamente do YouTube.");
    expect(creatorNew).toContain("KIVRYN does not download arbitrary YouTube videos.");
  });

  test("profile, strategy, analytics and Academy use the shared language provider", () => {
    for (const file of [profile, strategy, analytics, academy]) {
      expect(file).toContain("useLanguage");
    }
    expect(profile).toContain('t("common.save")');
    expect(strategy).toContain('t("creator.strategy")');
    expect(analytics).toContain('t("creator.analytics")');
    expect(academy).toContain('t("creator.academy")');
  });
});
