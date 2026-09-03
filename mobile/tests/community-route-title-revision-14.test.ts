import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const root = source("../app/_layout.tsx");
const app = source("../app/(app)/_layout.tsx");
const tabs = source("../app/(app)/(tabs)/_layout.tsx");
const more = source("../app/(app)/(tabs)/more.tsx");
const communityLayout = source("../app/(app)/community/_layout.tsx");
const home = source("../app/(app)/community/index.tsx");
const channel = source("../app/(app)/community/[channelId].tsx");
const squad = source("../app/(app)/community/squads/[squadId].tsx");

describe("NXR-028 Community navigation chrome", () => {
  test("every navigator boundary above Community suppresses its native header", () => {
    expect(root).toContain('<Stack.Screen name="(app)" options={{ headerShown: false }} />');
    expect(app).toContain('<Stack.Screen name="community" options={{ headerShown: false }} />');
    expect(tabs).toContain("headerShown: false");
    expect(communityLayout).toContain('<Stack screenOptions={{ headerShown: false }}>');
  });

  test("Community owns a headerless stack for home, channel, and Squad", () => {
    expect(communityLayout).toContain('<Stack.Screen name="index" />');
    expect(communityLayout).toContain('<Stack.Screen name="[channelId]" />');
    expect(communityLayout).toContain('<Stack.Screen name="squads/[squadId]" />');
    expect(app).not.toContain('name="community/[channelId]"');
  });

  test("product screens do not render technical route names", () => {
    for (const screen of [home, channel, squad]) {
      expect(screen).not.toContain('>community/[channelId]<');
      expect(screen).not.toMatch(/>\s*\((?:app|tabs)\)\s*</);
    }
    expect(home).toContain('<StandardHeader title="Community" />');
    expect(channel).toContain('<Text style={styles.title}>NEXORA Community</Text>');
  });

  test("navigation uses canonical public Community destinations", () => {
    expect(more).toContain('href="/community"');
    expect(home).toContain('pathname: "/community/[channelId]"');
    expect(home).toContain('router.push(`/community/squads/${s.id}`)');
  });

  test("missing or malformed channel parameters never fabricate a channel", () => {
    expect(channel).toContain('typeof params.channelId === "string" ? params.channelId.trim() : ""');
    expect(channel).not.toContain('"invalid-channel"');
    expect(channel).toContain('if (!channelId) return <UnavailableChannel />');
    expect(channel).toContain('Esta conversa não está disponível.');
    expect(channel).toContain('router.replace("/community")');
  });
});
