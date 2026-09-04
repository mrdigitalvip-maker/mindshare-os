import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  firstDisplayName,
  homeGreeting,
  normalizeHumanName,
  resolveCanonicalDisplayName,
} from "../../supabase/functions/_shared/user-identity";
import { boundWorkspaceContext } from "../../supabase/functions/_shared/assistant-context";

const source = (path: string) => readFileSync(path, "utf8");

describe("NXR-027 canonical user display name", () => {
  test("persisted profile full_name is canonical and whitespace is normalized", () => {
    expect(resolveCanonicalDisplayName("  Bruno   Silva  ", { full_name: "Auth Name" })).toBe(
      "Bruno Silva",
    );
    expect(firstDisplayName(" Bruno Silva ")).toBe("Bruno");
  });

  test("blank profile names may use intentionally supported trusted auth names", () => {
    expect(resolveCanonicalDisplayName("   ", { full_name: "  Ana Souza " })).toBe("Ana Souza");
    expect(resolveCanonicalDisplayName(null, { name: " Lia " })).toBe("Lia");
  });

  test("email and email local-part never become a personal name", () => {
    expect(normalizeHumanName(" user@example.com ")).toBeNull();
    expect(
      resolveCanonicalDisplayName("user@example.com", { name: "other@example.com" }),
    ).toBeNull();
    expect(resolveCanonicalDisplayName(null, {})).toBeNull();
    expect(resolveCanonicalDisplayName(null, {})).not.toBe("user");
    expect(source("lib/profile-identity.ts")).not.toContain('split("@")[0]');
    expect(source("components/profile-avatar.tsx")).not.toContain('split("@")[0]');
  });

  test("Home uses canonical identity and has an honest neutral greeting", () => {
    expect(homeGreeting("Bruno Silva")).toBe("Olá Bruno, vamos para o próximo passo.");
    expect(homeGreeting(null)).toBe("Olá, vamos para o próximo passo.");
    expect(source("app/(app)/(tabs)/dashboard.tsx")).toContain(
      "homeGreeting(profile.data?.displayName)",
    );
  });

  test("Assistant context accepts a human name but rejects an email identity", () => {
    expect(
      JSON.parse(
        boundWorkspaceContext({ profile: " Bruno ", tasks: [], projects: [], studies: [] }),
      ).profile,
    ).toBe("Bruno");
    expect(
      JSON.parse(
        boundWorkspaceContext({
          profile: "user@example.com",
          tasks: [],
          projects: [],
          studies: [],
        }),
      ).profile,
    ).toBeNull();
    expect(source("../supabase/functions/ai-chat/index.ts")).toContain(
      "resolveCanonicalDisplayName(profile.data?.full_name, authMetadata)",
    );
  });

  test("account email remains explicit account information, never a name fallback", () => {
    expect(source("app/(app)/settings.tsx")).toContain(
      "<Text style={s.email}>{session?.user.email",
    );
    expect(source("components/drawer-menu.tsx")).not.toContain('email?.split("@")[0]');
  });
});
