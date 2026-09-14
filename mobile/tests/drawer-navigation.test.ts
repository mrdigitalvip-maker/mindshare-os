import { strict as assert } from "node:assert";
import test from "node:test";

import { isDrawerRouteSelected } from "../lib/drawer-navigation.ts";

test("selects exact drawer routes", () => {
  assert.equal(isDrawerRouteSelected("/projects", "/projects"), true);
  assert.equal(isDrawerRouteSelected("/assistant", "/assistant"), true);
  assert.equal(isDrawerRouteSelected("/passport", "/passport"), true);
  assert.equal(isDrawerRouteSelected("/community", "/community"), true);
  assert.equal(isDrawerRouteSelected("/dashboard", "/assistant"), false);
});

test("selects nested module routes and ignores similarly prefixed routes", () => {
  assert.equal(isDrawerRouteSelected("/projects/abc-123", "/projects"), true);
  assert.equal(isDrawerRouteSelected("/studies/math/", "/studies"), true);
  assert.equal(isDrawerRouteSelected("/passport/lesson/abc-123", "/passport"), true);
  assert.equal(isDrawerRouteSelected("/creator/analytics", "/creator"), true);
  assert.equal(isDrawerRouteSelected("/projects-archive", "/projects"), false);
  assert.equal(isDrawerRouteSelected("/passport-old", "/passport"), false);
});
