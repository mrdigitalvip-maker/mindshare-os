import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("Metro includes the workspace contracts imported by the Android app", () => {
  const config = readFileSync("metro.config.js", "utf8");
  expect(config).toContain('path.resolve(projectRoot, "..")');
  expect(config).toContain("config.watchFolders = [workspaceRoot]");
});

test("native identity is prepared for verified kivryn.co app links", () => {
  const app = JSON.parse(readFileSync("app.json", "utf8")) as {
    expo: {
      scheme: string;
      android: {
        package: string;
        intentFilters: Array<{
          autoVerify?: boolean;
          data?: Array<{ scheme?: string; host?: string; pathPrefix?: string }>;
        }>;
      };
      ios?: { associatedDomains?: string[] };
      extra?: { publicSiteUrl?: string };
    };
  };

  expect(app.expo.scheme).toBe("kivryn");
  expect(app.expo.android.package).toBe("kivryn.app");
  expect(app.expo.extra?.publicSiteUrl).toBe("https://kivryn.co");
  expect(app.expo.ios?.associatedDomains).toContain("applinks:kivryn.co");

  const verifiedHosts = app.expo.android.intentFilters
    .filter((filter) => filter.autoVerify)
    .flatMap((filter) => filter.data ?? [])
    .filter((entry) => entry.scheme === "https" && entry.pathPrefix === "/")
    .map((entry) => entry.host);

  expect(verifiedHosts).toContain("kivryn.co");
  expect(verifiedHosts).toContain("www.kivryn.co");
});
