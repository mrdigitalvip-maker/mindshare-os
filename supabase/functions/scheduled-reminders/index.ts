import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Invoke every 30 minutes with a Supabase Scheduled Function. This coordinator
// evaluates each user's local time, quiet hours and daily dedupe before push-send.
Deno.serve(async (request) => {
  if (request.headers.get("x-scheduler-secret") !== Deno.env.get("SCHEDULER_SECRET"))
    return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL")!,
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, key);
  const { data: preferences } = await db.from("notification_preferences").select("*");
  let queued = 0;
  for (const pref of preferences ?? []) {
    let local: Date;
    try {
      local = new Date(new Date().toLocaleString("en-US", { timeZone: pref.timezone }));
    } catch {
      continue;
    }
    const hour = local.getHours();
    if (hour !== 18) continue;
    const day = local.toISOString().slice(0, 10);
    const { data: goal } = await db
      .from("studio_daily_goals")
      .select("completed")
      .eq("user_id", pref.user_id)
      .eq("goal_date", day)
      .maybeSingle();
    if (!pref.studio_enabled || goal?.completed) continue;
    const dedupe = "studio-goal-reminder";
    const { error } = await db
      .from("notification_deliveries")
      .insert({ user_id: pref.user_id, dedupe_key: dedupe, kind: "studio", delivered_on: day });
    if (error) continue;
    await fetch(`${url}/functions/v1/push-send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scheduler-secret": Deno.env.get("SCHEDULER_SECRET")!,
      },
      body: JSON.stringify({
        userId: pref.user_id,
        title: "Your Studio plan",
        body: "Your learning goal is still open when you are ready.",
        url: "/studio",
      }),
    });
    queued++;
  }
  return Response.json({ queued });
});
