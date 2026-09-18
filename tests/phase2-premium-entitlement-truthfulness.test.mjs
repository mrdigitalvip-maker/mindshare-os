import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const premium = readFileSync(
  new URL("../src/routes/_shell.premium.tsx", import.meta.url),
  "utf8",
);

test("Premium never treats an entitlement lookup failure as Free", () => {
  assert.match(premium, /isError/);
  assert.match(premium, /L\("Não verificado", "Not verified"\)/);
  assert.match(
    premium,
    /L\("Não foi possível verificar seu plano\. Nenhum entitlement será presumido\.", "Could not verify your plan\. No entitlement will be assumed\."\)/,
  );
  assert.match(premium, /onClick=\{\(\) => void refetch\(\)\}/);
  assert.match(premium, /checkingOut \|\| isLoading \|\| isError \|\| subscription\?\.isPremium/);
});

test("Free is only marked current after a successful entitlement lookup", () => {
  assert.match(
    premium,
    /badge=\{!isLoading && !isError && !subscription\?\.isPremium \? L\("Atual", "Current"\) : undefined\}/,
  );
  assert.match(premium, /L\("Plano não verificado", "Plan not verified"\)/);
});
