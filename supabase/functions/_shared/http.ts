const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";
const ALLOWED_METHODS = "POST, OPTIONS";

function configuredOrigin(): string | null {
  const value = Deno.env.get("APP_URL");
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  // CORS protects browser requests. Stripe, schedulers, and server-to-server callers omit Origin.
  if (!origin) return true;
  return configuredOrigin() === origin;
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  const origin = request.headers.get("Origin");
  if (origin && isOriginAllowed(request)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

export function rejectDisallowedOrigin(request: Request): Response | null {
  if (isOriginAllowed(request)) return null;
  return jsonResponse(request, { error: { code: "origin_not_allowed" } }, 403);
}

export function preflightResponse(request: Request): Response {
  const rejected = rejectDisallowedOrigin(request);
  return rejected ?? new Response(null, { status: 204, headers: corsHeaders(request) });
}
