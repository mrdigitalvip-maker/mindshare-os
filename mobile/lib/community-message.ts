import type { CommunityMessage } from "@/lib/community";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => Uint8Array;
};

/** Creates the idempotency key before a logical send. It is reused unchanged for retries. */
export function createCommunityRequestId(
  cryptoSource = globalThis.crypto as CryptoLike | undefined,
) {
  const nativeId = cryptoSource?.randomUUID?.();
  if (nativeId && UUID_V4.test(nativeId)) return nativeId;

  const bytes = new Uint8Array(16);
  if (cryptoSource?.getRandomValues) cryptoSource.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const isCommunityRequestId = (value: string) => UUID_V4.test(value);

/** PostgREST exposes a scalar UUID RPC as a string. Reject every other shape. */
export function normalizeCommunityMessageId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value.trim())) throw new Error("invalid_rpc_response");
  return value.trim();
}

/** A render-independent lock: React mutation state cannot close a same-frame double-tap race. */
export function createCommunitySendGate() {
  let locked = false;
  return {
    acquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
    isLocked: () => locked,
  };
}

export type FailedCommunitySend = {
  body: string;
  requestId: string;
  replyToId: string | null;
};

export const clearComposerAfterSend = (current: string, sentBody: string) =>
  current.trim() === sentBody ? "" : current;
export const clearReplyAfterSend = <T extends { id: string }>(current: T | null, replyId: string | null) =>
  current?.id === replyId ? null : current;
export const clearFailedAfterSend = (current: FailedCommunitySend | null, requestId: string) =>
  current?.requestId === requestId ? null : current;

/** Server pages can overlap at cursor boundaries or while realtime triggers a refetch. */
export function reconcileCommunityMessages(pages: CommunityMessage[][]) {
  const unique = new Map<string, CommunityMessage>();
  for (const message of pages.flat()) unique.set(message.id, message);
  return [...unique.values()].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
}
