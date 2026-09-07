import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { resolveAppDestination } from "../lib/auth-state";

const appLayout = readFileSync("app/(app)/_layout.tsx", "utf8");

describe("Android post-login fast path", () => {
  test("authenticated users enter dashboard while profile is still loading", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "loading" }),
    ).toBe("/dashboard");
  });

  test("profile errors never trap authenticated users on a loading screen", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "error" }),
    ).toBe("/dashboard");
    expect(appLayout).not.toContain("if (profile.isPending)");
    expect(appLayout).not.toContain("if (profile.isError)");
  });

  test("a confirmed incomplete profile still goes through onboarding", () => {
    expect(
      resolveAppDestination({ authStatus: "authenticated", onboarding: "incomplete" }),
    ).toBe("/onboarding");
    expect(appLayout).toContain("profile.isSuccess && !profile.data?.onboarded");
  });
});
