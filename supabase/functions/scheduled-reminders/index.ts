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
    const day = local.toISOString().slice(0, 10);
    if (insideQuietHours(local, pref.quiet_hours_start, pref.quiet_hours_end)) continue;
    // One useful project/task reminder per user and local day. The delivery
    // table remains the source of truth for retries and scheduler overlap.
    if (hour === 9 && pref.projects_enabled && pref.tasks_enabled) {
      const { data: projectTasks } = await db
        .from("tasks")
        .select("id,title,due_date,project_id,projects!inner(title,user_id)")
        .eq("user_id", pref.user_id)
        .eq("completed", false)
        .lte("due_date", day)
        .order("due_date", { ascending: true })
        .limit(1);
      const task = projectTasks?.[0];
      if (task?.project_id && task.due_date) {
        const dedupe = `project-task:${task.id}`;
        const { error } = await db.from("notification_deliveries").insert({
          user_id: pref.user_id,
          dedupe_key: dedupe,
          kind: "projects",
          delivered_on: day,
        });
        if (!error) {
          const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
          await fetch(`${url}/functions/v1/push-send`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-scheduler-secret": Deno.env.get("SCHEDULER_SECRET")!,
            },
            body: JSON.stringify({
              userId: pref.user_id,
              title: project?.title ?? "Seu projeto",
              body:
                task.due_date < day
                  ? `A tarefa “${task.title}” está atrasada.`
                  : `A tarefa “${task.title}” vence hoje.`,
              url: `/projects/${task.project_id}`,
            }),
          });
          queued++;
        }
      }
    }
    if (hour !== 18) continue;
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

function insideQuietHours(local: Date, start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const minute = local.getHours() * 60 + local.getMinutes();
  const parse = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const from = parse(start),
    to = parse(end);
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}
