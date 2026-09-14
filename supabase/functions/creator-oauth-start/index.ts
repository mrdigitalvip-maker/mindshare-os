import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import {
  PROVIDERS,
  allowedRedirect,
  encryptServerSecret,
  randomUrlSafe,
  sha256,
  type CreatorProvider,
} from "../_shared/creator-intelligence.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const input = await request.json().catch(() => ({}));
  const provider = input.provider as CreatorProvider;
  const config = PROVIDERS[provider];
  if (!config) return jsonResponse(request, { error: { code: "unsupported_provider" } }, 400);
  if (provider === "instagram") {
    return jsonResponse(
      request,
      { error: { code: "provider_pending_approval" }, readiness: config.readiness },
      409,
    );
  }

  const redirectUri = String(input.redirectUri ?? "").trim();
  if (!allowedRedirect(redirectUri)) {
    return jsonResponse(request, { error: { code: "redirect_not_allowed" } }, 400);
  }

  const clientId = Deno.env.get(provider === "youtube" ? "YOUTUBE_CLIENT_ID" : "TIKTOK_CLIENT_KEY");
  if (!clientId) {
    return jsonResponse(request, { error: { code: "provider_not_configured" } }, 503);
  }

  const state = randomUrlSafe();
  const nonce = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const challenge = await sha256(verifier);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const inserted = await admin.from("creator_oauth_states").insert({
    state_hash: await sha256(state),
    user_id: user.id,
    provider,
    nonce_hash: await sha256(nonce),
    pkce_verifier_ciphertext: await encryptServerSecret(verifier),
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (inserted.error) {
    console.error("creator_oauth_state_failed", inserted.error.code);
    return jsonResponse(request, { error: { code: "oauth_state_failed" } }, 500);
  }

  const callback = `${url}/functions/v1/creator-oauth-callback`;
  const params = new URLSearchParams(
    provider === "youtube"
      ? {
          client_id: clientId,
          redirect_uri: callback,
          response_type: "code",
          scope: config.scopes.join(" "),
          access_type: "offline",
          include_granted_scopes: "true",
          state,
          nonce,
          code_challenge: challenge,
          code_challenge_method: "S256",
          prompt: "consent",
        }
      : {
          client_key: clientId,
          redirect_uri: callback,
          response_type: "code",
          scope: config.scopes.join(","),
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
        },
  );

  return jsonResponse(request, {
    authorizationUrl: `${config.authorizationUrl}?${params.toString()}`,
    status: "authorizing",
    expiresInSeconds: 600,
  });
});
