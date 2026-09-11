import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { resolveAppDestination } from "../lib/auth-state";

const appLayout = readFileSync("app/(app)/_layout.tsx", "utf8");

describe("Android post-login provisioning gate", () => {
  test("authenticated users wait while required profile data is loading", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "loading" }),
    ).toBeNull();
  });

  test("profile errors cannot bypass provisioning into the application", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "error" }),
    ).toBeNull();
    expect(appLayout).toContain('lifecycle.state !== "ready"');
  });

  test("a confirmed incomplete profile still goes through onboarding", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "incomplete" }),
    ).toBe("/onboarding");
    expect(appLayout).toContain('return <Redirect href="/" />');
  });
});
