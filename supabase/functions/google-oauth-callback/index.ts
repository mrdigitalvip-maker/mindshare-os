import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Compatibility entrypoint for the Google Cloud OAuth client created before the
// provider-agnostic Creator/Integrations callback was introduced.
// The shared handler in creator-oauth-callback derives the exact callback URI
// from request.url, so Google's authorization-code exchange uses the same URI
// that initiated the flow.
import "../creator-oauth-callback/index.ts";
