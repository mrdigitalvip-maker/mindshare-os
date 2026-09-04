import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import approved from "./global-i18n-approved-literals.json";
import { translations } from "../i18n";
function files(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}
export function nativeLiteralViolations(source: string) {
  return [...source.matchAll(/<(?:Text|Button)[^>]*>\s*([A-Za-zÀ-ÿ][^<{]*?)\s*<\//g)].map((match) =>
    match[1].trim(),
  );
}
describe("NXR-035C whole-production i18n guard", () => {
  test("detects untranslated native literals", () => {
    expect(nativeLiteralViolations("<Text>Save changes</Text>")).toEqual(["Save changes"]);
    expect(nativeLiteralViolations('<Text>{t("common.save")}</Text>')).toEqual([]);
  });
  test("audits app, components, hooks, lib and services and rejects any new exception", () => {
    const root = process.cwd();
    const order = (x: { file: string; literal: string }) => `${x.file}\0${x.literal}`;
    const found = ["app", "components", "hooks", "lib", "services"]
      .flatMap((dir) => files(join(root, dir)))
      .flatMap((path) =>
        nativeLiteralViolations(readFileSync(path, "utf8")).map((literal) => ({
          file: relative(root, path),
          literal,
        })),
      )
      .sort((a, b) => order(a).localeCompare(order(b)));
    expect(found).toEqual([...approved].sort((a, b) => order(a).localeCompare(order(b))));
  });
  test("approved exceptions are exact literals, never directory wildcards", () => {
    expect(approved.length).toBeGreaterThan(0);
    expect(
      approved.every((x) => x.file.includes(".") && !x.file.endsWith("/") && x.literal.length > 0),
    ).toBe(true);
  });
  test("locale dictionaries have parity and nonempty copy", () => {
    expect(Object.keys(translations["pt-BR"]).sort()).toEqual(Object.keys(translations.en).sort());
    for (const locale of ["pt-BR", "en"] as const)
      expect(Object.values(translations[locale]).every((value) => value.trim().length > 0)).toBe(
        true,
      );
  });
});
