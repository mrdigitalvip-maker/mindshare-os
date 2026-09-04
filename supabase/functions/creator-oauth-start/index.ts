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
  if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, request);
  const url = Deno.env.get("SUPABASE_URL"),
    anon = Deno.env.get("SUPABASE_ANON_KEY"),
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service)
    return jsonResponse({ error: "configuration_error" }, 503, request);
  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse({ error: "unauthorized" }, 401, request);
  const input = await request.json().catch(() => ({}));
  const provider = input.provider as CreatorProvider;
  const config = PROVIDERS[provider];
  if (!config) return jsonResponse({ error: "unsupported_provider" }, 400, request);
  if (provider === "instagram")
    return jsonResponse(
      { error: "provider_pending_approval", readiness: config.readiness },
      409,
      request,
    );
  const redirectUri = String(input.redirectUri ?? "");
  if (!allowedRedirect(redirectUri))
    return jsonResponse({ error: "redirect_not_allowed" }, 400, request);
  const clientId = Deno.env.get(provider === "youtube" ? "YOUTUBE_CLIENT_ID" : "TIKTOK_CLIENT_KEY");
  if (!clientId) return jsonResponse({ error: "provider_not_configured" }, 503, request);
  const state = randomUrlSafe(),
    nonce = randomUrlSafe(),
    verifier = randomUrlSafe(48),
    challenge = await sha256(verifier),
    admin = createClient(url, service);
  const inserted = await admin
    .from("creator_oauth_states")
    .insert({
      state_hash: await sha256(state),
      user_id: user.id,
      provider,
      nonce_hash: await sha256(nonce),
      pkce_verifier_ciphertext: await encryptServerSecret(verifier),
      redirect_uri: redirectUri,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
  if (inserted.error) return jsonResponse({ error: "oauth_state_failed" }, 500, request);
  const callback = `${url}/functions/v1/creator-oauth-callback`;
  const params = new URLSearchParams(
    provider === "youtube"
      ? {
          client_id: clientId,
          redirect_uri: callback,
          response_type: "code",
          scope: config.scopes.join(" "),
          access_type: "offline",
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
  return jsonResponse(
    {
      authorizationUrl: `${config.authorizationUrl}?${params}`,
      status: "authorizing",
      expiresInSeconds: 600,
    },
    200,
    request,
  );
});
