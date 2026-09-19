import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  decryptServerSecret,
  encryptServerSecret,
  isGoogleOAuthProvider,
  providerClientId,
  providerClientSecret,
  PROVIDERS,
  safeProviderError,
  sha256,
  type CreatorProvider,
} from "../_shared/creator-intelligence.ts";
Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const requestUrl = new URL(request.url),
    state = requestUrl.searchParams.get("state") ?? "",
    code = requestUrl.searchParams.get("code") ?? "",
    providerError = requestUrl.searchParams.get("error") ?? "";
  if (!state || state.length > 512 || code.length > 4096 || providerError.length > 256)
    return new Response("Invalid OAuth callback", { status: 400 });
  const url = Deno.env.get("SUPABASE_URL"),
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return new Response("Configuration error", { status: 503 });
  const admin = createClient(url, service),
    stateHash = await sha256(state);
  const { data: oauth } = await admin
    .from("creator_oauth_states")
    .select("*")
    .eq("state_hash", stateHash)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!oauth) return new Response("Expired or invalid OAuth state", { status: 400 });
  const { data: consumed } = await admin
    .from("creator_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", stateHash)
    .is("consumed_at", null)
    .select("state_hash")
    .maybeSingle();
  if (!consumed) return new Response("Expired or invalid OAuth state", { status: 400 });
  const provider = oauth.provider as CreatorProvider,
    config = PROVIDERS[provider];
  if (provider === "instagram" || !("tokenUrl" in config))
    return redirect(oauth.redirect_uri, "error", "provider_pending_approval", provider);
  if (providerError) {
    return redirect(
      oauth.redirect_uri,
      "error",
      providerError === "access_denied" ? "permission_denied" : "oauth_provider_error",
      provider,
    );
  }
  if (!code) return redirect(oauth.redirect_uri, "error", "invalid_oauth_callback", provider);
  const clientId = providerClientId(provider),
    clientSecret = providerClientSecret(provider);
  if (!clientId || !clientSecret)
    return redirect(oauth.redirect_uri, "error", "provider_not_configured", provider);
  const verifier = await decryptServerSecret(oauth.pkce_verifier_ciphertext),
    callback = `${url}/functions/v1/creator-oauth-callback`;
  const body = new URLSearchParams(
    isGoogleOAuthProvider(provider)
      ? {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callback,
          code_verifier: verifier,
        }
      : {
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callback,
          code_verifier: verifier,
        },
  );
  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenResponse.ok)
    return redirect(oauth.redirect_uri, "error", safeProviderError(tokenResponse.status), provider);
  const token = (await tokenResponse.json()) as Record<string, unknown>,
    accessToken = String(token.access_token ?? "");
  if (!accessToken) return redirect(oauth.redirect_uri, "error", "token_exchange_failed", provider);
  const identityResponse = await fetch(config.identityUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!identityResponse.ok)
    return redirect(oauth.redirect_uri, "error", safeProviderError(identityResponse.status), provider);
  const identity = (await identityResponse.json()) as Record<string, any>;
  const account = provider === "youtube"
    ? identity.items?.[0]
    : provider === "tiktok"
      ? identity.data?.user
      : identity;
  const accountId = String(
    provider === "youtube"
      ? (account?.id ?? "")
      : provider === "tiktok"
        ? (account?.open_id ?? "")
        : (account?.sub ?? ""),
  );
  if (!accountId) return redirect(oauth.redirect_uri, "error", "identity_failed", provider);
  const displayName =
    provider === "youtube"
      ? account?.snippet?.title
      : provider === "tiktok"
        ? account?.display_name
        : account?.email ?? account?.name ?? "Google Account";
  const avatarUrl =
    provider === "youtube"
      ? account?.snippet?.thumbnails?.default?.url ??
        account?.snippet?.thumbnails?.medium?.url ??
        account?.snippet?.thumbnails?.high?.url ??
        null
      : provider === "tiktok"
        ? account?.avatar_url ?? null
        : account?.picture ?? null;
  const safeAvatarUrl =
    typeof avatarUrl === "string" && avatarUrl.startsWith("https://") ? avatarUrl.slice(0, 2048) : null;
  const scopes = String(token.scope ?? "")
      .split(/[ ,]+/)
      .filter(Boolean),
    now = new Date().toISOString();
  const connection = await admin
    .from("creator_platform_connections")
    .upsert(
      {
        user_id: oauth.user_id,
        platform: provider,
        external_account_id: accountId,
        provider_display_name: displayName,
        provider_avatar_url: safeAvatarUrl,
        provider_account_type: provider === "youtube" ? "channel" : "account",
        status: "connected",
        granted_scopes: scopes,
        last_attempt_at: now,
        // A connection grants scopes, not evidence. Metrics become granted only
        // after creator-analytics-sync actually observes them from the provider.
        granted_metrics: [],
        safe_error_code: null,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,platform,external_account_id" },
    )
    .select("id")
    .single();
  if (connection.error)
    return redirect(oauth.redirect_uri, "error", "connection_persistence_failed", provider);
  const { data: existingCredential } = await admin
    .from("creator_provider_credentials")
    .select("refresh_token_ciphertext")
    .eq("connection_id", connection.data.id)
    .maybeSingle();
  const credential = await admin
    .from("creator_provider_credentials")
    .upsert({
      connection_id: connection.data.id,
      provider_account_id: accountId,
      access_token_ciphertext: await encryptServerSecret(accessToken),
      refresh_token_ciphertext: token.refresh_token
        ? await encryptServerSecret(String(token.refresh_token))
        : existingCredential?.refresh_token_ciphertext ?? null,
      expires_at: token.expires_in
        ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
        : null,
      scopes,
      revoked_at: null,
      updated_at: now,
    });
  if (credential.error)
    return redirect(oauth.redirect_uri, "error", "credential_persistence_failed", provider);
  return redirect(oauth.redirect_uri, "connected", undefined, provider);
});
function redirect(
  base: string,
  status: string,
  error?: string,
  provider?: CreatorProvider,
) {
  const target = new URL(base);
  target.searchParams.set("creator_connection", status);
  if (provider) target.searchParams.set("provider", provider);
  if (error) target.searchParams.set("error", error);
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
