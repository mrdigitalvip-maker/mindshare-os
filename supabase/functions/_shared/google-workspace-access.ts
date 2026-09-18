import {
  canUseKivrynIntegrationCapability,
  type KivrynIntegrationCapability,
} from "./kivryn-integration-registry.ts";
import {
  decryptServerSecret,
  encryptServerSecret,
  providerClientId,
  providerClientSecret,
  type CreatorProvider,
} from "./creator-intelligence.ts";

export type GoogleWorkspaceProvider = "gmail" | "google_calendar" | "google_drive";

type AdminClient = {
  from: (table: string) => any;
};

export class GoogleWorkspaceAccessError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "GoogleWorkspaceAccessError";
  }
}

export async function resolveGoogleWorkspaceAccess(input: {
  admin: AdminClient;
  userId: string;
  provider: GoogleWorkspaceProvider;
  capability: KivrynIntegrationCapability;
}) {
  const { admin, userId, provider, capability } = input;
  const { data: rows, error: connectionError } = await admin
    .from("creator_platform_connections")
    .select("id,status,granted_scopes,updated_at")
    .eq("user_id", userId)
    .eq("platform", provider)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (connectionError) throw new GoogleWorkspaceAccessError("connection_lookup_failed");
  const connection = rows?.[0];
  if (!connection) throw new GoogleWorkspaceAccessError("connection_required");

  const grantedScopes = Array.isArray(connection.granted_scopes)
    ? connection.granted_scopes.map(String)
    : [];
  const clientId = providerClientId(provider as CreatorProvider);
  const clientSecret = providerClientSecret(provider as CreatorProvider);
  if (!clientId || !clientSecret) {
    throw new GoogleWorkspaceAccessError("provider_not_configured");
  }
  if (
    !canUseKivrynIntegrationCapability({
      provider,
      capability,
      connectionStatus: "connected",
      grantedScopes,
      runtimeConfigured: true,
    })
  ) {
    throw new GoogleWorkspaceAccessError("insufficient_scope");
  }

  const { data: credential, error: credentialError } = await admin
    .from("creator_provider_credentials")
    .select("access_token_ciphertext,refresh_token_ciphertext,expires_at,scopes")
    .eq("connection_id", connection.id)
    .maybeSingle();
  if (credentialError || !credential) {
    throw new GoogleWorkspaceAccessError("credential_expired");
  }

  const expiresAt = credential.expires_at
    ? Date.parse(credential.expires_at)
    : Number.POSITIVE_INFINITY;
  if (expiresAt > Date.now() + 5 * 60_000) {
    return {
      accessToken: await decryptServerSecret(credential.access_token_ciphertext),
      connectionId: String(connection.id),
      grantedScopes,
    };
  }
  if (!credential.refresh_token_ciphertext) {
    throw new GoogleWorkspaceAccessError("credential_expired");
  }

  const refreshToken = await decryptServerSecret(credential.refresh_token_ciphertext);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) {
    await admin
      .from("creator_platform_connections")
      .update({
        status: "expired",
        safe_error_code: "credential_expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    throw new GoogleWorkspaceAccessError("credential_expired");
  }

  const refreshed = (await response.json()) as Record<string, unknown>;
  const accessToken = typeof refreshed.access_token === "string" ? refreshed.access_token : "";
  if (!accessToken) throw new GoogleWorkspaceAccessError("credential_expired");

  const scopes =
    typeof refreshed.scope === "string" && refreshed.scope.trim()
      ? refreshed.scope.split(/[ ,]+/).filter(Boolean)
      : Array.isArray(credential.scopes)
        ? credential.scopes.map(String)
        : grantedScopes;
  const expiresIn = Number(refreshed.expires_in);
  const updated = await admin
    .from("creator_provider_credentials")
    .update({
      access_token_ciphertext: await encryptServerSecret(accessToken),
      expires_at: Number.isFinite(expiresIn)
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : credential.expires_at,
      scopes,
      updated_at: new Date().toISOString(),
    })
    .eq("connection_id", connection.id);
  if (updated.error) throw new GoogleWorkspaceAccessError("credential_refresh_persistence_failed");

  return {
    accessToken,
    connectionId: String(connection.id),
    grantedScopes: scopes,
  };
}
