export type NativePermission = "granted" | "denied" | "blocked" | "undetermined" | "unsupported";

export function normalizeNotificationPermission(value: {
  granted?: boolean;
  canAskAgain?: boolean;
  status?: string;
}): NativePermission {
  if (value.granted) return "granted";
  if (value.canAskAgain === false) return "blocked";
  return value.status === "undetermined" ? "undetermined" : "denied";
}

export function normalizeProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

/** Bounded in-memory tap dedupe; the native last-response slot is cleared separately. */
export function createNotificationResponseDedupe(limit = 32) {
  const handled = new Set<string>();
  return (identifier: string) => {
    if (!identifier || handled.has(identifier)) return false;
    handled.add(identifier);
    if (handled.size > limit) handled.delete(handled.values().next().value!);
    return true;
  };
}
