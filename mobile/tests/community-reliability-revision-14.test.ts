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

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const conversation = source("../app/(app)/community/[channelId].tsx");
const hooks = source("../hooks/use-community.ts");
const service = source("../services/community-service.ts");
const sql = source("../../supabase/migrations/202608290006_community_live.sql").toLowerCase();
const messageId = "36d0dcd5-d846-4de2-846d-06712c2ef31e";

describe("NXR-029 Community delivery reliability", () => {
  test("one logical send gets one valid request ID and rapid taps are synchronously rejected", () => {
    const gate = createCommunitySendGate();
    const id = createCommunityRequestId({ getRandomValues: (bytes) => (bytes.fill(7), bytes) });
    expect(isCommunityRequestId(id)).toBe(true);
    expect(gate.acquire()).toBe(true);
    expect(gate.acquire()).toBe(false);
    gate.release();
    expect(gate.acquire()).toBe(true);
  });

  test("an ambiguous failure retains the canonical request and reply for idempotent retry", () => {
    const failed: FailedCommunitySend = {
      body: "Mensagem real",
      requestId: createCommunityRequestId(),
      replyToId: messageId,
    };
    const retry = { ...failed };
    expect(retry.requestId).toBe(failed.requestId);
    expect(retry.replyToId).toBe(messageId);
    expect(normalizeCommunityMessageId(messageId)).toBe(messageId);
    expect(clearFailedAfterSend(failed, retry.requestId)).toBeNull();
  });

  test("completion only clears state belonging to that send", () => {
    const old: FailedCommunitySend = { body: "old", requestId: messageId, replyToId: null };
    expect(clearComposerAfterSend("new draft", "old")).toBe("new draft");
    expect(clearComposerAfterSend(" old ", "old")).toBe("");
    expect(clearReplyAfterSend({ id: "new-reply" }, messageId)).toEqual({ id: "new-reply" });
    expect(clearReplyAfterSend({ id: messageId }, messageId)).toBeNull();
    expect(clearFailedAfterSend(old, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBe(old);
  });

  test("backend and transport errors are normalized into distinct safe product copy", () => {
    expect(communityErrorMessage({ message: "rate_limited", code: "P0001" })).toBe(
      "Muitas tentativas. Aguarde um pouco.",
    );
    expect(communityErrorMessage({ details: "duplicate_message", message: "Database error" })).toBe(
      "Esta mensagem já foi enviada.",
    );
    expect(communityErrorMessage({ hint: "membership_required" })).toContain("Entre na comunidade");
    expect(communityErrorMessage({ message: "membership_restricted" })).toContain("restrita");
    expect(communityErrorMessage(new TypeError("Failed to fetch"))).toContain("Sem conexão");
    expect(communityErrorMessage({ message: "select secret from public.table" })).not.toContain("select");
  });

  test("malformed scalar RPC results never become successful message IDs", () => {
    for (const value of [undefined, null, "", {}, { id: messageId }, [messageId], "[object Object]"])
      expect(() => normalizeCommunityMessageId(value)).toThrow("invalid_rpc_response");
    expect(normalizeCommunityMessageId(messageId)).toBe(messageId);
  });

  test("mobile send is server-authoritative and invalidates the canonical channel query", () => {
    expect(service).toContain('rpc<unknown>("send_community_message"');
    expect(service).toContain("normalizeCommunityMessageId(result)");
    expect(service).not.toMatch(/from\(["']community_messages["']\)\.insert/);
    expect(conversation).not.toMatch(/optimistic|setquerydata/i);
    expect(hooks).toContain("queryKeys.communityMessages(channelId)");
    expect(conversation).toContain("send(failed.body, failed.requestId, failed.replyToId)");
  });

  test("SQL counts prior successful user messages globally after idempotency lookup", () => {
    const idempotency = sql.indexOf("client_request_id=p_client_request_id");
    const rateLimit = sql.indexOf("interval '1 minute'", idempotency);
    const duplicate = sql.indexOf("interval '20 seconds'", idempotency);
    expect(idempotency).toBeGreaterThan(-1);
    expect(rateLimit).toBeGreaterThan(idempotency);
    expect(duplicate).toBeGreaterThan(rateLimit);
    expect(sql.slice(idempotency, rateLimit)).toContain("return result");
    expect(sql).toContain("where user_id=uid and created_at>");
    expect(sql).toContain("actor_type public.community_message_actor not null default 'user'");
  });
});
