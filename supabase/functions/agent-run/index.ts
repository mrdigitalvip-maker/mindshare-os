import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { AgentExecutionError, executeAgentRun } from "../_shared/agent-execution.ts";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

const safeError = (request: Request, code: string, status: number) =>
  jsonResponse(
    request,
    {
      ok: false,
      error: {
        code,
        message:
          code === "premium_required"
            ? "Premium subscription required."
            : "Agent execution failed.",
      },
    },
    status,
  );

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const originError = rejectDisallowedOrigin(request);
  if (originError) return originError;
  if (request.method !== "POST") return safeError(request, "invalid_request", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) return safeError(request, "configuration_error", 500);

  const auth = request.headers.get("Authorization") ?? "";
  const scoped = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const admin = createClient(url, serviceKey);
  const {
    data: { user },
  } = await scoped.auth.getUser();
  if (!user) return safeError(request, "unauthorized", 401);

  const body = (await request.json().catch(() => null)) as {
    agentId?: string;
    input?: string;
  } | null;
  const input = body?.input?.trim();
  if (!body?.agentId || !input || input.length > 12000)
    return safeError(request, "invalid_request", 400);

  try {
    const result = await executeAgentRun({
      admin,
      userId: user.id,
      agentId: body.agentId,
      input,
      trigger: "manual",
    });
    return jsonResponse(request, {
      ok: true,
      data: {
        runId: result.runId,
        output: result.output,
        contextScopes: result.contextScopes,
      },
    });
  } catch (error) {
    const code = error instanceof AgentExecutionError ? error.code : "provider_error";
    const status =
      code === "premium_required"
        ? 403
        : code === "resource_not_found"
          ? 404
          : code === "invalid_request"
            ? 400
            : code === "provider_rate_limited"
              ? 429
              : code === "configuration_error" || code === "persistence_error"
                ? 500
                : 502;
    return safeError(request, code, status);
  }
});
