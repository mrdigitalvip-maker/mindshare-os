import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  copyCommunityText,
  messageActions,
  normalizeCommunityProfile,
  normalizeCommunityUsername,
  profileValidation,
} from "../lib/community-ui";
import { reconcileCommunityMessages } from "../lib/community-message";
import type { CommunityMessage } from "../lib/community";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const home = source("../app/(app)/community/index.tsx");
const chat = source("../app/(app)/community/[channelId].tsx");
const hooks = source("../hooks/use-community.ts");
const service = source("../services/community-service.ts");
const v3 = source("../../supabase/migrations/202609130001_community_v3_real_network.sql").toLowerCase();
const msg = (id: string, overrides: Partial<CommunityMessage> = {}): CommunityMessage => ({
  id,
  clientRequestId: null,
  body: id,
  createdAt: "2026-09-01T10:00:00Z",
  actorType: "user",
  senderPublicId: "real-user",
  displayName: "Pessoa real",
  avatarUrl: null,
  isSelf: false,
  removed: false,
  replyToId: null,
  reactions: {},
  myReaction: null,
  ...overrides,
});

describe("Community V3 — persisted social truth", () => {
  test("home is built around real profiles and official communities", () => {
    expect(home).toContain("isCommunityProfileReady");
    expect(home).toContain("channel.memberCount");
    expect(home).toContain("channel.unreadCount");
    expect(home).toContain("hasActiveOfficialMembership(channel)");
    expect(home).not.toMatch(/pessoas online|membros ativos|ranking/i);
  });

  test("profile normalization, validation and reserved identities are explicit", () => {
    expect(normalizeCommunityUsername("  @@Nome_2 ")).toBe("nome_2");
    expect(
      normalizeCommunityProfile({ displayName: " Ana ", username: " @ANA ", bio: " oi " }),
    ).toEqual({ displayName: "Ana", username: "ana", bio: "oi" });
    expect(profileValidation("Ana", "ana", true)).toBeNull();
    expect(profileValidation("Ana", "kivryn", true)).not.toBeNull();
    expect(profileValidation("", "ana", true)).not.toBeNull();
    expect(service).toContain("p_show_streak: clean.showStreak");
  });

  test("chat preserves idempotent send, replies and overlapping-page reconciliation", () => {
    expect(chat).toContain("createCommunitySendGate");
    expect(chat).toContain("sendLogical(failedSend)");
    expect(service).toContain("p_client_request_id: requestId");
    expect(service).toContain("p_reply_to: replyToId ?? null");
    expect(reconcileCommunityMessages([[msg("a")], [msg("a")]])).toHaveLength(1);
    expect(service).toContain("removeChannel(channel)");
  });

  test("official messages are distinguishable from real members", () => {
    expect(messageActions(msg("self", { isSelf: true })).canReport).toBe(false);
    expect(messageActions(msg("host", { actorType: "system", senderPublicId: null })).canBlock).toBe(false);
    expect(messageActions(msg("real")).canBlock).toBe(true);
    expect(chat).toContain("KIVRYN • OFICIAL");
    expect(v3).toContain("actor_type = 'system'");
  });

  test("public profile lookup never returns raw account identity", () => {
    expect(service).toContain("getPublicProfile");
    expect(hooks).toContain("useCommunityPublicProfile");
    expect(v3).toContain("community_public_user_id");
    expect(v3).not.toContain("select email");
  });

  test("clipboard utility remains safe even if the new screen does not require it", async () => {
    expect(await copyCommunityText("real", false, undefined)).toBe(false);
    let copied = "";
    expect(
      await copyCommunityText("real", false, {
        setStringAsync: async (value) => {
          copied = value;
        },
      }),
    ).toBe(true);
    expect(copied).toBe("real");
  });

  test("notification state remains backend canonical", () => {
    expect(chat).toContain("channel.notificationMode === mode");
    expect(hooks).toContain("service.setNotificationMode");
    expect(chat).not.toMatch(/push (ativado|garantido)/i);
  });
});
