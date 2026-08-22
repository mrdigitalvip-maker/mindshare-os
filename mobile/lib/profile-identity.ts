import type { User } from "@supabase/supabase-js";

export type ProfileRecord = { id: string; fullName: string | null; avatarUrl: string | null; onboarded: boolean };
export type ProfileIdentity = ProfileRecord & { displayName: string; email: string | null; provider: string };

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
export function providerIdentity(user: Pick<User, "email" | "user_metadata" | "app_metadata">) {
  const metadata = user.user_metadata ?? {};
  return {
    name: text(metadata.full_name) ?? text(metadata.name),
    avatarUrl: text(metadata.avatar_url) ?? text(metadata.picture),
    provider: text(user.app_metadata?.provider) ?? "email",
  };
}

export function normalizeProfileIdentity(user: Pick<User, "id" | "email" | "user_metadata" | "app_metadata">, profile: ProfileRecord): ProfileIdentity {
  const provider = providerIdentity(user);
  const localPart = text(user.email?.split("@")[0])?.replace(/[._-]+/g, " ") ?? null;
  return { ...profile, displayName: text(profile.fullName) ?? provider.name ?? localPart ?? "Conta NEXORA", email: text(user.email), provider: provider.provider,
    avatarUrl: text(profile.avatarUrl) ?? provider.avatarUrl };
}

export function initialProfileValues(user: Pick<User, "id" | "user_metadata" | "app_metadata">) {
  const identity = providerIdentity(user as Pick<User, "email" | "user_metadata" | "app_metadata">);
  return { id: user.id, full_name: identity.name, avatar_url: identity.avatarUrl, onboarded: false };
}
