import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  decryptServerSecret,
  encryptServerSecret,
  PROVIDERS,
  safeProviderError,
  sha256,
  type CreatorProvider,
} from "../_shared/creator-intelligence.ts";
Deno.serve(async (request) => {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const requestUrl = new URL(request.url),
    state = requestUrl.searchParams.get("state") ?? "",
    code = requestUrl.searchParams.get("code") ?? "";
  if (!state || !code || state.length > 512 || code.length > 4096)
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
  await admin
    .from("creator_oauth_states")
    .update({ consumed_at: new Date().toISOString() })
    .eq("state_hash", stateHash)
    .is("consumed_at", null);
  const provider = oauth.provider as CreatorProvider,
    config = PROVIDERS[provider];
  if (provider === "instagram" || !("tokenUrl" in config))
    return redirect(oauth.redirect_uri, "error", "provider_pending_approval");
  const clientId = Deno.env.get(provider === "youtube" ? "YOUTUBE_CLIENT_ID" : "TIKTOK_CLIENT_KEY"),
    clientSecret = Deno.env.get(
      provider === "youtube" ? "YOUTUBE_CLIENT_SECRET" : "TIKTOK_CLIENT_SECRET",
    );
  if (!clientId || !clientSecret)
    return redirect(oauth.redirect_uri, "error", "provider_not_configured");
  const verifier = await decryptServerSecret(oauth.pkce_verifier_ciphertext),
    callback = `${url}/functions/v1/creator-oauth-callback`;
  const body = new URLSearchParams(
    provider === "youtube"
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
    return redirect(oauth.redirect_uri, "error", safeProviderError(tokenResponse.status));
  const token = (await tokenResponse.json()) as Record<string, unknown>,
    accessToken = String(token.access_token ?? "");
  if (!accessToken) return redirect(oauth.redirect_uri, "error", "token_exchange_failed");
  const identityResponse = await fetch(config.identityUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!identityResponse.ok)
    return redirect(oauth.redirect_uri, "error", safeProviderError(identityResponse.status));
  const identity = (await identityResponse.json()) as Record<string, any>;
  const account = provider === "youtube" ? identity.items?.[0] : identity.data?.user;
  const accountId = String(provider === "youtube" ? (account?.id ?? "") : (account?.open_id ?? ""));
  if (!accountId) return redirect(oauth.redirect_uri, "error", "identity_failed");
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
        provider_display_name:
          provider === "youtube" ? account?.snippet?.title : account?.display_name,
        status: "connected",
        granted_scopes: scopes,
        granted_metrics:
          provider === "youtube"
            ? [
                "views",
                "watch_time_ms",
                "average_view_duration_ms",
                "likes",
                "comments",
                "followers_gained",
                "country",
                "day",
              ]
            : ["views", "likes", "comments", "shares"],
        safe_error_code: null,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: "user_id,platform,external_account_id" },
    )
    .select("id")
    .single();
  if (connection.error)
    return redirect(oauth.redirect_uri, "error", "connection_persistence_failed");
  const credential = await admin
    .from("creator_provider_credentials")
    .upsert({
      connection_id: connection.data.id,
      provider_account_id: accountId,
      access_token_ciphertext: await encryptServerSecret(accessToken),
      refresh_token_ciphertext: token.refresh_token
        ? await encryptServerSecret(String(token.refresh_token))
        : null,
      expires_at: token.expires_in
        ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
        : null,
      scopes,
      revoked_at: null,
      updated_at: now,
    });
  if (credential.error)
    return redirect(oauth.redirect_uri, "error", "credential_persistence_failed");
  return redirect(oauth.redirect_uri, "connected");
});
function redirect(base: string, status: string, error?: string) {
  const target = new URL(base);
  target.searchParams.set("creator_connection", status);
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
