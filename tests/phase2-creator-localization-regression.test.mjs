import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const creator = readFileSync(
  new URL("../src/routes/_shell.creator.tsx", import.meta.url),
  "utf8",
);

test("Creator profile and strategy use locale-aware copy", () => {
  assert.match(creator, /L\("Perfil do Creator", "Creator profile"\)/);
  assert.match(creator, /L\("Nível de experiência", "Experience level"\)/);
  assert.match(creator, /L\("Estratégia e metas", "Strategy & goals"\)/);
  assert.match(creator, /L\("Estratégia de conteúdo", "Content strategy"\)/);
  assert.match(creator, /L\("Salvar estratégia", "Save strategy"\)/);
});

test("Creator analytics and provider controls use locale-aware copy", () => {
  assert.match(creator, /L\("Analytics verificados pelo provedor", "Provider-verified analytics"\)/);
  assert.match(creator, /L\("Sincronizar analytics", "Sync analytics"\)/);
  assert.match(creator, /L\("Confirmar desconexão", "Confirm disconnect"\)/);
  assert.match(creator, /L\("Registro manual de conteúdo", "Manual content log"\)/);
  assert.match(creator, /L\("Inteligência por país", "Country intelligence"\)/);
});

test("Creator Academy and manual evidence remain bilingual", () => {
  assert.match(creator, /L\("Academia do Creator", "Creator Academy"\)/);
  assert.match(creator, /creatorAcademyLabel\(lesson, resolvedLocale\)/);
  assert.match(creator, /creatorMetricLabel\(metric, resolvedLocale\)/);
  assert.match(creator, /creatorCountryFieldLabel\(key, resolvedLocale\)/);
});

test("reported Creator hardcoded-English regressions are no longer direct UI literals", () => {
  assert.doesNotMatch(creator, />Creator profile<\/strong>/);
  assert.doesNotMatch(creator, />Strategy & goals<\/strong>/);
  assert.doesNotMatch(creator, />Provider-verified analytics/);
  assert.doesNotMatch(creator, /<CardTitle>Manual content log<\/CardTitle>/);
  assert.doesNotMatch(creator, /<CardTitle>Manual analytics<\/CardTitle>/);
  assert.doesNotMatch(creator, /<strong className="block">Creator Academy<\/strong>/);
});
