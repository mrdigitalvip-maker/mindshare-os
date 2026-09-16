import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const aiService = read("src/services/ai-service.ts");
const actionContract = read("src/lib/nexora-actions.ts");
const actionService = read("src/services/nexora-action-service.ts");
const assistantRoute = read("src/routes/_shell.assistant.tsx");
const backend = read("supabase/functions/ai-chat/index.ts");

test("web assistant keeps validated mutation proposals from ai-chat", () => {
  assert.match(backend, /proposedActions:\s*parsedModelResponse\.proposed_actions/);
  assert.match(aiService, /proposedActions:\s*NexoraMutationAction\[\]/);
  assert.match(aiService, /parseNexoraMutationActions\(result\.proposedActions\)/);
  assert.match(actionContract, /export function parseNexoraMutationActions/);
});

test("web assistant requires explicit approval before audited RPC execution", () => {
  assert.match(assistantRoute, /Alteração proposta/);
  assert.match(assistantRoute, /Confirmar/);
  assert.match(assistantRoute, /confirmed:\s*true/);
  assert.match(assistantRoute, /Alteração cancelada\. Nada foi modificado\./);
  assert.match(actionService, /\.rpc\("apply_nexora_action"/);
  assert.match(actionService, /p_confirmed:\s*true/);
  assert.match(actionService, /p_conversation_id:\s*input\.conversationId/);
});

test("web executor preserves idempotent authenticated action contract", () => {
  assert.match(actionService, /p_action_id:\s*input\.actionId/);
  assert.match(actionService, /p_request_id:\s*input\.requestId/);
  assert.match(actionService, /result\.idempotent/);
  assert.doesNotMatch(actionService, /service_role/i);
});
