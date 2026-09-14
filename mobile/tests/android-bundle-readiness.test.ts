import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("Metro includes the workspace contracts imported by the Android app", () => {
  const config = readFileSync("metro.config.js", "utf8");
  expect(config).toContain('path.resolve(projectRoot, "..")');
  expect(config).toContain("config.watchFolders = [workspaceRoot]");
});

test("native identity is prepared for canonical kivryn.co app links", () => {
  const app = JSON.parse(readFileSync("app.json", "utf8")) as {
    expo: {
      scheme: string;
      icon?: string;
      android: {
        package: string;
        icon?: string;
        adaptiveIcon?: { foregroundImage?: string };
        intentFilters: Array<{
          autoVerify?: boolean;
          data?: Array<{ scheme?: string; host?: string; pathPrefix?: string }>;
        }>;
      };
      ios?: { associatedDomains?: string[] };
      extra?: {
        publicSiteUrl?: string;
        publicSupabaseUrl?: string;
        publicSupabasePublishableKey?: string;
      };
    };
  };

  expect(app.expo.scheme).toBe("kivryn");
  expect(app.expo.android.package).toBe("kivryn.app");
  expect(app.expo.extra?.publicSiteUrl).toBe("https://kivryn.co");
  expect(app.expo.ios?.associatedDomains).toContain("applinks:kivryn.co");
  expect(app.expo.icon).toBe("./assets/branding/kivryn-app-icon.png");
  expect(app.expo.android.icon).toBe("./assets/branding/kivryn-app-icon.png");
  expect(app.expo.android.adaptiveIcon?.foregroundImage).toBe(
    "./assets/branding/kivryn-app-icon.png",
  );

  const authScreen = readFileSync("features/auth/auth-screen.tsx", "utf8");
  expect(authScreen).toContain('require("../../assets/branding/kivryn-app-icon.png")');
  expect(authScreen).not.toContain("nexora-app-icon-master.png");

  const verifiedHosts = app.expo.android.intentFilters
    .filter((filter) => filter.autoVerify)
    .flatMap((filter) => filter.data ?? [])
    .filter((entry) => entry.scheme === "https" && entry.pathPrefix === "/")
    .map((entry) => entry.host);

  expect(verifiedHosts).toContain("kivryn.co");
  expect(verifiedHosts).not.toContain("www.kivryn.co");
});

test("production Android auth cannot ship without public Supabase configuration", () => {
  const app = JSON.parse(readFileSync("app.json", "utf8")) as {
    expo: {
      extra?: {
        publicSupabaseUrl?: string;
        publicSupabasePublishableKey?: string;
      };
    };
  };
  const eas = JSON.parse(readFileSync("eas.json", "utf8")) as {
    build?: {
      production?: {
        env?: Record<string, string>;
      };
    };
  };
  const client = readFileSync("lib/supabase.ts", "utf8");

  expect(app.expo.extra?.publicSupabaseUrl).toBe("https://qoxtwbhpovkxfiambwgz.supabase.co");
  expect(app.expo.extra?.publicSupabasePublishableKey).toMatch(/^sb_publishable_/);
  expect(eas.build?.production?.env?.EXPO_PUBLIC_SUPABASE_URL).toBe(
    "https://qoxtwbhpovkxfiambwgz.supabase.co",
  );
  expect(eas.build?.production?.env?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toMatch(
    /^sb_publishable_/,
  );
  expect(client).toContain("Constants.expoConfig?.extra");
  expect(client).toContain("extra.publicSupabaseUrl");
  expect(client).toContain("extra.publicSupabasePublishableKey");
});
