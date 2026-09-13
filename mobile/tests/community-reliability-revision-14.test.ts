import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { communityErrorMessage } from "../lib/community";
import {
  clearComposerAfterSend,
  clearFailedAfterSend,
  clearReplyAfterSend,
  createCommunityRequestId,
  createCommunitySendGate,
  isCommunityRequestId,
  normalizeCommunityMessageId,
  type FailedCommunitySend,
} from "../lib/community-message";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const conversation = source("../app/(app)/community/[channelId].tsx");
const hooks = source("../hooks/use-community.ts");
const service = source("../services/community-service.ts");
const v3 = source("../../supabase/migrations/202609130001_community_v3_real_network.sql").toLowerCase();
const messageId = "36d0dcd5-d846-4de2-846d-06712c2ef31e";

describe("KIVRYN Community V3 delivery reliability", () => {
  test("one logical send gets one valid request ID and rapid taps are synchronously rejected", () => {
    const gate = createCommunitySendGate();
    const id = createCommunityRequestId({ getRandomValues: (bytes) => (bytes.fill(7), bytes) });
    expect(isCommunityRequestId(id)).toBe(true);
    expect(gate.acquire()).toBe(true);
    expect(gate.acquire()).toBe(false);
    gate.release();
    expect(gate.acquire()).toBe(true);
  });

  test("ambiguous failures retain canonical request and reply IDs for idempotent retry", () => {
    const failed: FailedCommunitySend = {
      body: "Mensagem real",
      requestId: createCommunityRequestId(),
      replyToId: messageId,
    };
    expect({ ...failed }.requestId).toBe(failed.requestId);
    expect(normalizeCommunityMessageId(messageId)).toBe(messageId);
    expect(clearFailedAfterSend(failed, failed.requestId)).toBeNull();
  });

  test("completion clears only state belonging to the successful send", () => {
    const old: FailedCommunitySend = { body: "old", requestId: messageId, replyToId: null };
    expect(clearComposerAfterSend("new draft", "old")).toBe("new draft");
    expect(clearComposerAfterSend(" old ", "old")).toBe("");
    expect(clearReplyAfterSend({ id: "new-reply" }, messageId)).toEqual({ id: "new-reply" });
    expect(clearReplyAfterSend({ id: messageId }, messageId)).toBeNull();
    expect(clearFailedAfterSend(old, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(old);
  });

  test("backend and transport errors map to safe product copy", () => {
    expect(communityErrorMessage({ message: "rate_limited", code: "P0001" })).toContain("Aguarde");
    expect(communityErrorMessage({ details: "duplicate_message" })).toContain("já foi enviada");
    expect(communityErrorMessage({ hint: "membership_required" })).toContain("Entre na comunidade");
    expect(communityErrorMessage({ message: "profile_required" })).toContain("perfil");
    expect(communityErrorMessage(new TypeError("Failed to fetch"))).toContain("Sem conexão");
  });

  test("malformed scalar RPC results never become successful message IDs", () => {
    for (const value of [undefined, null, "", {}, { id: messageId }, [messageId], "[object Object]"])
      expect(() => normalizeCommunityMessageId(value)).toThrow("invalid_rpc_response");
    expect(normalizeCommunityMessageId(messageId)).toBe(messageId);
  });

  test("mobile send remains server-authoritative and canonical", () => {
    expect(service).toContain('rpc<unknown>("send_community_message"');
    expect(service).toContain("normalizeCommunityMessageId(result)");
    expect(service).not.toMatch(/from\(["']community_messages["']\)\.insert/);
    expect(conversation).toContain("createCommunitySendGate");
    expect(conversation).toContain("sendLogical(failedSend)");
    expect(hooks).toContain("queryKeys.communityMessages(channelId)");
  });

  test("V3 keeps server-side idempotency, throttling and read state", () => {
    expect(v3).toContain("client_request_id");
    expect(v3).toContain("interval '1 minute'");
    expect(v3).toContain("interval '20 seconds'");
    expect(v3).toContain("mark_community_read");
    expect(v3).toContain("last_read_at");
  });
});
