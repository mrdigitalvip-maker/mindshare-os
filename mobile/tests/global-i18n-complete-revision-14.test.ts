import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import approved from "./global-i18n-approved-literals.json";
import { formatDateLabel, translations } from "../i18n";

// Brand names, locale names, symbols, and internationally established product terms are
// intentionally shared. Every other identical value is treated as an untranslated regression.
const localeNeutralValues = new Set([
  "NEXORA",
  "N E X O R A",
  "NEXORA Community",
  "NEXORA PREMIUM",
  "PREMIUM",
  "Momentum",
  "NEXORA CREATOR CENTER",
  "VIRAL CLIPS STUDIO",
  "Bio",
  "PRO",
  "Pro",
  "Português (Brasil)",
  "English",
  "×",
]);
const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();

const approvedEntries = approved as Array<{ file: string; literal: string }>;
const dictionaries = translations as Record<"pt-BR" | "en", Record<string, string>>;
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
describe("NXR-035D whole-production i18n guard", () => {
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
        nativeLiteralViolations(readFileSync(path, "utf8"))
          .filter((literal) => !/^(?:set[A-Z]|void\s)/.test(literal))
          .map((literal) => ({
            file: relative(root, path),
            literal,
          })),
      )
      .sort((a, b) => order(a).localeCompare(order(b)));
    expect(found).toEqual([...approvedEntries].sort((a, b) => order(a).localeCompare(order(b))));
  });
  test("approved exceptions are exact literals, never directory wildcards", () => {
    expect(approvedEntries).toHaveLength(0);
    expect(
      approvedEntries.every(
        (x) => x.file.includes(".") && !x.file.endsWith("/") && x.literal.length > 0,
      ),
    ).toBe(true);
  });
  test("locale dictionaries have parity and nonempty copy", () => {
    expect(Object.keys(translations["pt-BR"]).sort()).toEqual(Object.keys(translations.en).sort());
    for (const locale of ["pt-BR", "en"] as const)
      expect(Object.values(translations[locale]).every((value) => value.trim().length > 0)).toBe(
        true,
      );
  });
  test("English is semantic rather than copied Portuguese", () => {
    const portugueseMarkers =
      /\b(?:agora|amanhã|ainda|carregar|concluir|configurações|criar|dados|excluir|hoje|nenhum|nenhuma|não|ontem|plano|projeto|seu|sua|tarefas?|tentar|você)\b/i;
    for (const [key, english] of Object.entries(dictionaries.en)) {
      expect(english).not.toMatch(portugueseMarkers);
      const portuguese = dictionaries["pt-BR"][key];
      if (english === portuguese) expect(localeNeutralValues.has(english)).toBe(true);
    }
  });
  test("interpolations retain the same named parameters in both locales", () => {
    for (const key of Object.keys(dictionaries.en))
      expect(placeholders(dictionaries.en[key])).toEqual(placeholders(dictionaries["pt-BR"][key]));
  });
  test("relative and full dates follow the selected locale", () => {
    const now = new Date(2026, 8, 4, 12);
    expect(formatDateLabel(new Date(2026, 8, 4), "pt-BR", now)).toBe("Hoje");
    expect(formatDateLabel(new Date(2026, 8, 3), "pt-BR", now)).toBe("Ontem");
    expect(formatDateLabel(new Date(2026, 8, 5), "pt-BR", now)).toBe("Amanhã");
    expect(formatDateLabel(new Date(2026, 8, 4), "en", now)).toBe("Today");
    expect(formatDateLabel(new Date(2026, 8, 3), "en", now)).toBe("Yesterday");
    expect(formatDateLabel(new Date(2026, 8, 5), "en", now)).toBe("Tomorrow");
    expect(formatDateLabel(new Date(2026, 8, 6), "pt-BR", now)).toBe("6 de setembro de 2026");
    expect(formatDateLabel(new Date(2026, 8, 6), "en", now)).toBe("September 6, 2026");
  });
});
