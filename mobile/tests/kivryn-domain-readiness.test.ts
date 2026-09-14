import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

describe("KIVRYN canonical domain readiness", () => {
  test("canonical code defaults use kivryn.co", () => {
    const env = source("../../.env.example");
    const sitemap = source("../../src/routes/sitemap[.]xml.ts");
    const robots = source("../../public/robots.txt");

    expect(env).toContain("APP_URL=https://kivryn.co");
    expect(env).toContain("VITE_PUBLIC_SITE_URL=https://kivryn.co");
    expect(env).not.toContain("https://nexora.app");
    expect(sitemap).toContain('"https://kivryn.co"');
    expect(robots).toContain("Sitemap: https://kivryn.co/sitemap.xml");
  });

  test("Android and Digital Asset Links agree on the canonical KIVRYN host", () => {
    const app = JSON.parse(source("../app.json")) as {
      expo: {
        android: {
          package: string;
          intentFilters: Array<{
            autoVerify?: boolean;
            data?: Array<{ scheme?: string; host?: string }>;
          }>;
        };
      };
    };
    const assetLinks = JSON.parse(source("../../public/.well-known/assetlinks.json")) as Array<{
      target?: { package_name?: string; sha256_cert_fingerprints?: string[] };
    }>;

    expect(app.expo.android.package).toBe("kivryn.app");
    expect(assetLinks[0]?.target?.package_name).toBe("kivryn.app");
    expect(assetLinks[0]?.target?.sha256_cert_fingerprints?.length).toBeGreaterThan(0);

    const verifiedHosts = app.expo.android.intentFilters
      .filter((filter) => filter.autoVerify)
      .flatMap((filter) => filter.data ?? [])
      .filter((entry) => entry.scheme === "https")
      .map((entry) => entry.host);

    expect(verifiedHosts).toEqual(["kivryn.co"]);
  });
});
