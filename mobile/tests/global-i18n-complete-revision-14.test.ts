import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { translations } from "../i18n";

function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}
export function nativeLiteralViolations(source: string) {
  return [...source.matchAll(/<(?:Text|Button)[^>]*>\s*([A-Za-zÀ-ÿ][^<{]*?)\s*<\//g)].map((match) =>
    match[1].trim(),
  );
}

describe("NXR-035B complete global i18n guard", () => {
  test("detects a user-facing literal that bypasses translation", () => {
    expect(nativeLiteralViolations("<Text>Save changes</Text>")).toEqual(["Save changes"]);
    expect(nativeLiteralViolations('<Text>{t("common.save")}</Text>')).toEqual([]);
  });
  test("all production Creator UI literals use the shared translator", () => {
    const creatorFiles = files(join(process.cwd(), "app/(app)/creator"));
    const violations = creatorFiles.flatMap((path) =>
      nativeLiteralViolations(readFileSync(path, "utf8")),
    );
    expect(violations).toEqual([]);
  });
  test("locale dictionaries have complete parity and nonempty copy", () => {
    expect(Object.keys(translations["pt-BR"]).sort()).toEqual(Object.keys(translations.en).sort());
    for (const locale of ["pt-BR", "en"] as const)
      expect(Object.values(translations[locale]).every((value) => value.trim().length > 0)).toBe(
        true,
      );
  });
});
