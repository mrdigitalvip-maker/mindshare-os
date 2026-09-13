import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  createCommunityRequestId,
  isCommunityRequestId,
  reconcileCommunityMessages,
} from "../lib/community-message";
import { communityErrorMessage, hasActiveOfficialMembership } from "../lib/community";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const v3 = source("../../supabase/migrations/202609130001_community_v3_real_network.sql").toLowerCase();
const digest = source("../../supabase/migrations/202609130002_community_v3_notification_digest.sql").toLowerCase();
const service = source("../services/community-service.ts");
const conversation = source("../app/(app)/community/[channelId].tsx");
const home = source("../app/(app)/community/index.tsx");

describe("KIVRYN Community V3 real network contract", () => {
  test("client request IDs remain standards-valid UUID v4 values", () => {
    const id = createCommunityRequestId({
      getRandomValues: (bytes) => {
        bytes.fill(17);
        return bytes;
      },
    });
    expect(id).toBe("11111111-1111-4111-9111-111111111111");
    expect(isCommunityRequestId(id)).toBe(true);
  });

  test("official access stays server-authoritative and profile-gated", () => {
    expect(v3).toContain("community_profile_ready");
    expect(v3).toContain("profile_required");
    expect(v3).toContain("public.has_premium(uid)");
    expect(communityErrorMessage(new Error("profile_required"))).toContain("perfil");
    expect(communityErrorMessage(new Error("premium_required"))).toContain("Premium");
  });

  test("channel summaries use real member and unread counts", () => {
    expect(v3).toContain("'member_count'");
    expect(v3).toContain("'unread_count'");
    expect(v3).toContain("last_read_at");
    expect(service).toContain("memberCount: Number(r.member_count ?? 0)");
    expect(service).toContain("unreadCount: Number(r.unread_count ?? 0)");
    expect(service).toContain('rpc("mark_community_read"');
  });

  test("public profiles use opaque identifiers and shared-membership privacy", () => {
    expect(v3).toContain("community_public_user_id");
    expect(v3).toContain("get_community_public_profile");
    expect(v3).not.toContain("select email");
    expect(service).toContain("getPublicProfile");
    expect(conversation).toContain("useCommunityPublicProfile");
  });

  test("real membership state is the only source for entering a chat", () => {
    const base = {
      id: "channel",
      slug: "nexora-community" as const,
      name: "KIVRYN Community",
      description: null,
      premium: false,
      notificationMode: "highlights" as const,
      memberCount: 1,
      unreadCount: 0,
      recentBody: null,
      recentAt: null,
    };
    expect(
      hasActiveOfficialMembership({ ...base, joined: true, eligible: true, membershipStatus: "active" }),
    ).toBe(true);
    expect(
      hasActiveOfficialMembership({ ...base, joined: true, eligible: false, membershipStatus: "active" }),
    ).toBe(false);
    expect(
      hasActiveOfficialMembership({ ...base, joined: true, eligible: true, membershipStatus: "restricted" }),
    ).toBe(false);
  });

  test("official prompts are transparent and limited to one per day", () => {
    expect(v3).toContain("kivryn");
    expect(v3).toContain("sent_count >= 1");
    expect(v3).toContain("one transparent official conversation starter per day");
    expect(conversation).toContain("KIVRYN • OFICIAL");
    expect(conversation).toContain("nunca se passam por usuários reais");
  });

  test("daily notifications are based on genuine unread data", () => {
    expect(digest).toContain("unread_count");
    expect(digest).toContain("notification_mode <> 'muted'");
    expect(digest).toContain("public.has_premium(p_user)");
  });

  test("server-page reconciliation removes duplicate realtime/refetch rows", () => {
    const message = {
      id: "one",
      clientRequestId: null,
      body: "Oi",
      createdAt: "2026-01-01T00:00:00Z",
      actorType: "system" as const,
      senderPublicId: null,
      displayName: "KIVRYN",
      avatarUrl: null,
      isSelf: false,
      removed: false,
      replyToId: null,
      reactions: {},
      myReaction: null,
    };
    expect(reconcileCommunityMessages([[message], [message]])).toEqual([message]);
  });

  test("product never fabricates online users, ranks or synthetic social proof", () => {
    expect(home).not.toMatch(/pessoas online|membros ativos|ranking|fake users/i);
    expect(v3).not.toContain("fake_user");
    expect(v3).not.toContain("momentum_events");
  });
});
