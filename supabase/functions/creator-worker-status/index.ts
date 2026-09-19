import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";

const ACTIVE_WINDOW_MS = 60_000;
const PROCESSING = ["analyzing","transcribing","selecting_clips","rendering"] as const;
const QUEUED = ["queued","retry_wait"] as const;

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

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

  const [workers, ownQueued, ownProcessing] = await Promise.all([
    admin
      .from("creator_worker_instances")
      .select("status,last_heartbeat_at")
      .gte("last_heartbeat_at", cutoff)
      .in("status", ["starting", "idle", "busy"]),
    admin
      .from("creator_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", [...QUEUED]),
    admin
      .from("creator_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", [...PROCESSING]),
  ]);

  if (workers.error || ownQueued.error || ownProcessing.error) {
    return jsonResponse(request, { error: { code: "worker_status_unavailable" } }, 503);
  }

  const active = workers.data ?? [];
  const busy = active.filter((worker) => worker.status === "busy").length;
  const available = active.length > 0;
  return jsonResponse(request, {
    available,
    state: available ? (busy === active.length ? "busy" : "online") : "offline",
    activeWorkers: active.length,
    busyWorkers: busy,
    ownQueue: {
      queued: ownQueued.count ?? 0,
      processing: ownProcessing.count ?? 0,
    },
  });
});
