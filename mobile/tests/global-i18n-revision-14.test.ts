import { describe, expect, test } from "bun:test";
import {
  formatDateLabel,
  LANGUAGE_STORAGE_KEY,
  resolveLocale,
  translate,
  translations,
} from "../i18n";
describe("NXR-035 global i18n", () => {
  test("system locale resolution has English global fallback", () => {
    expect(resolveLocale("system", "pt-PT")).toBe("pt-BR");
    expect(resolveLocale("system", "en-US")).toBe("en");
    expect(resolveLocale("system", "fr-FR")).toBe("en");
  });
  test("manual preferences override the device", () => {
    expect(resolveLocale("pt-BR", "en-US")).toBe("pt-BR");
    expect(resolveLocale("en", "pt-BR")).toBe("en");
  });
  test("preference has installation-scoped persistence key", () =>
    expect(LANGUAGE_STORAGE_KEY).toBe("nexora.ui-language.v1"));
  test("core navigation and language choices exist in both locales", () => {
    for (const locale of ["pt-BR", "en"] as const)
      for (const key of [
        "nav.home",
        "nav.assistant",
        "nav.projects",
        "nav.more",
        "settings.language",
        "language.system",
        "language.pt-BR",
        "language.en",
      ] as const)
        expect(translations[locale][key]).toBeTruthy();
  });
  test("dictionaries have parity and keys never render", () => {
    expect(Object.keys(translations["pt-BR"]).sort()).toEqual(Object.keys(translations.en).sort());
    expect(translate("en", "common.save")).not.toContain("common.save");
  });
  test("dates and notification templates follow locale without translating user content", () => {
    const date = new Date(2026, 8, 3);
    expect(formatDateLabel(date, "pt-BR", new Date(2026, 8, 4))).toBe("Ontem");
    expect(formatDateLabel(date, "en", new Date(2026, 8, 4))).toBe("Yesterday");
    expect(translate("en", "notification.progress", { title: "Projeto X" })).toContain("Projeto X");
  });
});
