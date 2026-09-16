import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [client, edge] = await Promise.all([
  readFile(new URL("../src/services/push-service.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/push-send/index.ts", import.meta.url), "utf8"),
]);

test("Web Push test consumes the push-send accepted count", () => {
  assert.match(edge, /return jsonResponse\(request, \{ accepted, failed \}, 200\)/);
  assert.match(client, /result\?\.accepted \?\? result\?\.delivered \?\? 0/);
  assert.match(client, /return accepted/);
});
