import type { CommunityMessage } from "@/lib/community";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/** Server pages can overlap at cursor boundaries or while realtime triggers a refetch. */
export function reconcileCommunityMessages(pages: CommunityMessage[][]) {
  const unique = new Map<string, CommunityMessage>();
  for (const message of pages.flat()) unique.set(message.id, message);
  return [...unique.values()].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
}
