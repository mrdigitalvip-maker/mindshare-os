import assert from "node:assert/strict";
import { parseNexoraModelResponse } from "../supabase/functions/_shared/nexora-actions.js";

const navigationCases = [
  ["Abra meus projetos.", "navigate_projects"],
  ["Me leve para Estudos.", "navigate_studies"],
  ["Abra configurações.", "navigate_settings"],
];

for (const [request, name] of navigationCases) {
  const parsed = parseNexoraModelResponse({
    message: `Atendendo ao pedido explícito: ${request}`,
    action: { type: "navigation", name },
  });
  assert.equal(parsed?.action?.name, name);
}

for (const request of ["Como melhorar minha produtividade?", "Crie um projeto para mim."]) {
  const parsed = parseNexoraModelResponse({ message: request, action: null });
  assert.equal(parsed?.action, undefined);
}

assert.equal(
  parseNexoraModelResponse({
    message: "Não posso executar isso.",
    action: { type: "mutation", name: "create_project" },
  })?.action,
  undefined,
);
assert.equal(
  parseNexoraModelResponse({
    message: "A ação desconhecida foi ignorada.",
    action: { type: "navigation", name: "navigate_external" },
  })?.action,
  undefined,
);
assert.equal(parseNexoraModelResponse({ action: null }), null);

console.log("NEXORA action contract checks passed");
