import type { User } from "@supabase/supabase-js";
import { normalizeHumanName, resolveCanonicalDisplayName } from "../../supabase/functions/_shared/user-identity";

export { homeGreeting } from "../../supabase/functions/_shared/user-identity";

export type ProfileRecord = { id: string; fullName: string | null; avatarUrl: string | null; onboarded: boolean };
export type ProfileIdentity = ProfileRecord & { displayName: string | null; email: string | null; provider: string };

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
export function providerIdentity(user: Pick<User, "email" | "user_metadata" | "app_metadata">) {
  const metadata = user.user_metadata ?? {};
  return {
    name: resolveCanonicalDisplayName(null, metadata),
    avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture),
    provider: text(user.app_metadata?.provider) ?? "email",
  };
}

export function normalizeProfileIdentity(user: Pick<User, "id" | "email" | "user_metadata" | "app_metadata">, profile: ProfileRecord): ProfileIdentity {
  const provider = providerIdentity(user);
  return { ...profile, displayName: resolveCanonicalDisplayName(profile.fullName, user.user_metadata), email: text(user.email), provider: provider.provider,
    avatarUrl: text(profile.avatarUrl) ?? provider.avatarUrl };
}

export function initialProfileValues(user: Pick<User, "id" | "user_metadata" | "app_metadata">) {
  const identity = providerIdentity(user as Pick<User, "email" | "user_metadata" | "app_metadata">);
  return { id: user.id, full_name: normalizeHumanName(identity.name), avatar_url: identity.avatarUrl, onboarded: false };
}
