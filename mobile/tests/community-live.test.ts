import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  createCommunityRequestId,
  isCommunityRequestId,
  reconcileCommunityMessages,
} from "../lib/community-message";
import { communityErrorMessage, hasActiveOfficialMembership } from "../lib/community";
const sql = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/202608290006_community_live.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();
const service = readFileSync(
  fileURLToPath(new URL("../services/community-service.ts", import.meta.url)),
  "utf8",
);
const conversation = readFileSync(
  fileURLToPath(new URL("../app/(app)/community/[channelId].tsx", import.meta.url)),
  "utf8",
);
const layout = readFileSync(
  fileURLToPath(new URL("../app/(app)/_layout.tsx", import.meta.url)),
  "utf8",
);
describe("Community Live server contract", () => {
  test("client request IDs are standards-valid UUID v4 values", () => {
    const id = createCommunityRequestId({
      getRandomValues: (bytes) => {
        bytes.fill(17);
        return bytes;
      },
    });
    expect(id).toBe("11111111-1111-4111-9111-111111111111");
    expect(isCommunityRequestId(id)).toBe(true);
  });
  test("send trims and validates input while retaining the retry request ID", () => {
    expect(service).toContain("const clean = body.trim()");
    expect(service).toContain("clean.length > 1200");
    expect(service).toContain("p_client_request_id: requestId");
    expect(conversation).toContain("send(failed.body, failed.requestId)");
    expect(conversation).toContain("onSuccess: () =>");
    expect(conversation).not.toContain('setBody("");\n    setFailed(null);');
  });
  test("conversation route never exposes its filesystem route header", () => {
    expect(layout).toContain('name="community/[channelId]" options={{ headerShown: false }}');
    expect(conversation).toContain('"NEXORA Community"');
  });
  test("backend errors have specific human-readable messages", () => {
    expect(communityErrorMessage(new Error("membership_required"))).toContain("Entre");
    expect(communityErrorMessage(new Error("premium_required"))).toContain("Premium");
    expect(communityErrorMessage(new Error("rate_limited"))).toContain("Aguarde");
    expect(communityErrorMessage(new Error("duplicate_message"))).toContain("já foi enviada");
    expect(communityErrorMessage(new Error("Network request failed"))).toContain("conexão");
  });
  test("official channel access uses only the backend eligibility and membership response", () => {
    const base = {
      id: "channel",
      slug: "nexora-community" as const,
      name: "NEXORA Community",
      premium: false,
      notificationMode: "highlights" as const,
      recentBody: null,
      recentAt: null,
    };
    expect(
      hasActiveOfficialMembership({
        ...base,
        joined: true,
        eligible: true,
        membershipStatus: "active",
      }),
    ).toBe(true);
    expect(
      hasActiveOfficialMembership({
        ...base,
        joined: true,
        eligible: false,
        membershipStatus: "active",
      }),
    ).toBe(false);
    expect(
      hasActiveOfficialMembership({
        ...base,
        joined: true,
        eligible: true,
        membershipStatus: "restricted",
      }),
    ).toBe(false);
  });
  test("server-page reconciliation removes duplicate realtime/refetch rows", () => {
    const message = {
      id: "one",
      clientRequestId: null,
      body: "Oi",
      createdAt: "2026-01-01T00:00:00Z",
      actorType: "system" as const,
      senderPublicId: null,
      displayName: "NEXORA Host",
      avatarUrl: null,
      isSelf: false,
      removed: false,
      replyToId: null,
      reactions: {},
      myReaction: null,
    };
    expect(reconcileCommunityMessages([[message], [message]])).toEqual([message]);
    expect(message.actorType).toBe("system");
    expect(message.displayName).toBe("NEXORA Host");
  });
  test("official access is server authoritative", () => {
    expect(sql).toContain("'nexora-community','nexora community',false");
    expect(sql).toContain("public.has_premium(uid)");
    expect(sql).toContain("premium_required");
  });
  test("membership and restrictions gate posting", () => {
    expect(sql).toContain("membership_required");
    expect(sql).toContain("membership_restricted");
  });
  test("Host is privileged, bounded and idempotent", () => {
    expect(sql).toContain("auth.role()<>'service_role'");
    expect(sql).toContain("unique(channel_id,host_key)");
    expect(sql).toContain("state.sent_count>=2");
  });
  test("send is idempotent, rate limited and paginated", () => {
    expect(sql).toContain("unique(user_id,client_request_id)");
    expect(sql).toContain("limit least(greatest(p_limit,1),50)");
    expect(sql).toContain("interval '1 minute'");
  });
  test("removed content, reports and blocks are enforced", () => {
    expect(sql).toContain("mensagem removida.");
    expect(sql).toContain("'message',p_message");
    expect(sql).toContain("block_community_message_sender");
  });
  test("social actions never award Momentum", () => {
    expect(sql).toContain("on conflict(message_id,user_id) do update");
    expect(sql).not.toContain("insert into public.momentum_events");
  });
  test("privacy excludes workspace and email", () => {
    expect(sql).not.toContain("select email");
    expect(sql).not.toContain("projects");
    expect(sql).not.toContain("assistant messages");
  });
  test("realtime scopes, reconciles and cleans up", () => {
    expect(service).toContain("filter: `channel_id=eq.${channelId}`");
    expect(service).toContain("removeChannel(channel)");
    expect(service).toContain("setTimeout(onChange, 120)");
    expect(conversation).toContain("reconcileCommunityMessages");
    expect(conversation).toContain("actions.react.isPending");
  });
  test("notifications default conservatively", () => {
    expect(sql).toContain("default 'highlights'");
  });
});
