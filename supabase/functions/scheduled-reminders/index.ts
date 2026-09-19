import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// E72 — personalized reminders on the existing notification pipeline.
// One scheduler evaluates owner preferences, local time, quiet hours and dedupe.
// No synthetic activity is created: every reminder is derived from persisted KIVRYN state.
Deno.serve(async (request) => {
  const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
  if (!schedulerSecret || request.headers.get("x-scheduler-secret") !== schedulerSecret)
    return new Response("Unauthorized", { status: 401 });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key)
    return Response.json({ ok: false, error: "configuration_error" }, { status: 503 });

  const db = createClient(url, key);
  const { data: preferences, error: preferencesError } = await db
    .from("notification_preferences")
    .select("*");
  if (preferencesError)
    return Response.json({ ok: false, error: "preferences_lookup_failed" }, { status: 500 });

  const now = new Date();
  let queued = 0;

  for (const pref of preferences ?? []) {
    const clock = localClock(now, pref.timezone);
    if (!clock) continue;
    if (insideQuietHours(clock.minutes, pref.quiet_hours_start, pref.quiet_hours_end)) continue;

    const { data: profile } = await db
      .from("profiles")
      .select("language")
      .eq("id", pref.user_id)
      .maybeSingle();
    const locale: "pt" | "en" =
      typeof profile?.language === "string" && profile.language.toLowerCase().startsWith("en")
        ? "en"
        : "pt";

    if (clock.hour === 8 && pref.daily_summary_enabled === true) {
      const summary = await buildDailySummary(db, pref.user_id, clock.day, pref.timezone, locale);
      if (summary) {
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `daily-summary:${clock.day}`,
            kind: "daily_summary",
            title: tr(locale, "Seu dia na KIVRYN", "Your day in KIVRYN"),
            body: summary,
            route: "/dashboard",
          }),
        );
      }
    }

    // Pending approvals are authorization-sensitive, so the body never reveals
    // action payloads. External integration approvals also respect integrations_enabled.
    if (clock.hour >= 8 && clock.hour < 21 && pref.approvals_enabled !== false) {
      const { data: approvals } = await db
        .from("agent_runs")
        .select("id,agent_id,action_plan,created_at")
        .eq("user_id", pref.user_id)
        .eq("action_plan_status", "pending_approval")
        .order("created_at", { ascending: true })
        .limit(5);
      const approval = (approvals ?? []).find((run) => {
        const steps = Array.isArray(run.action_plan?.steps) ? run.action_plan.steps : [];
        const external = steps.some(
          (step: Record<string, unknown>) => step?.domain === "integrations",
        );
        return !external || pref.integrations_enabled !== false;
      });
      if (approval) {
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `agent-approval:${approval.id}`,
            kind: "approval",
            title: tr(locale, "Aprovação pendente", "Approval pending"),
            body: tr(
              locale,
              "A KIVRYN tem uma ação pronta para sua revisão. Nada será executado sem sua aprovação.",
              "KIVRYN has an action ready for review. Nothing will execute without your approval.",
            ),
            route: `/agents/${approval.agent_id}`,
          }),
        );
      }
    }

    if (clock.hour === 9 && pref.tasks_enabled !== false) {
      const { data: tasks } = await db
        .from("tasks")
        .select("id,title,due_date,project_id,projects(title)")
        .eq("user_id", pref.user_id)
        .eq("completed", false)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(20);
      const task = (tasks ?? []).find(
        (item) => localDay(item.due_date, pref.timezone) <= clock.day,
      );
      if (task?.due_date) {
        const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
        const taskDay = localDay(task.due_date, pref.timezone);
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `task-due:${task.id}`,
            kind: "tasks",
            title:
              pref.projects_enabled !== false && project?.title
                ? String(project.title)
                : tr(locale, "Tarefa importante", "Important task"),
            body:
              taskDay < clock.day
                ? tr(
                    locale,
                    `A tarefa “${task.title}” está atrasada.`,
                    `“${task.title}” is overdue.`,
                  )
                : tr(
                    locale,
                    `A tarefa “${task.title}” vence hoje.`,
                    `“${task.title}” is due today.`,
                  ),
            route:
              pref.projects_enabled !== false && task.project_id
                ? `/projects/${task.project_id}`
                : `/tasks/${task.id}`,
          }),
        );
      }
    }

    if (clock.hour === 12 && pref.premium_enabled !== false) {
      const { data: subscription } = await db
        .from("subscriptions")
        .select("id,status,current_period_end,cancel_at_period_end")
        .eq("user_id", pref.user_id)
        .in("status", ["trialing", "active"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subscription?.current_period_end) {
        const endDay = localDay(subscription.current_period_end, pref.timezone);
        const days = dayDistance(clock.day, endDay);
        const relevant =
          (subscription.status === "trialing" || subscription.cancel_at_period_end === true) &&
          [3, 1, 0].includes(days);
        if (relevant) {
          queued += Number(
            await deliver({
              db,
              url,
              schedulerSecret,
              userId: pref.user_id,
              day: clock.day,
              dedupeKey: `premium-period:${subscription.id}:${endDay}`,
              kind: "premium",
              title: tr(locale, "Atualização do Premium", "Premium update"),
              body:
                subscription.status === "trialing"
                  ? tr(
                      locale,
                      days === 0
                        ? "Seu período de teste termina hoje."
                        : `Seu período de teste termina em ${days} dia(s).`,
                      days === 0
                        ? "Your trial ends today."
                        : `Your trial ends in ${days} day(s).`,
                    )
                  : tr(
                      locale,
                      days === 0
                        ? "Sua assinatura está programada para terminar hoje."
                        : `Sua assinatura está programada para terminar em ${days} dia(s).`,
                      days === 0
                        ? "Your subscription is scheduled to end today."
                        : `Your subscription is scheduled to end in ${days} day(s).`,
                    ),
              route: "/premium",
            }),
          );
        }
      }
    }

    if (clock.hour === 17 && pref.studies_enabled !== false) {
      const horizon = addDays(clock.day, 7);
      const { data: goals } = await db
        .from("study_goals")
        .select("id,subject_id,title,target_value,current_value,due_at")
        .eq("user_id", pref.user_id)
        .eq("completed", false)
        .lte("due_at", horizon)
        .order("due_at", { ascending: true })
        .limit(1);
      const goal = goals?.[0];
      if (goal?.due_at) {
        const remaining = Math.max(0, Number(goal.target_value) - Number(goal.current_value ?? 0));
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `study-goal:${goal.id}`,
            kind: "studies",
            title: goal.title || tr(locale, "Meta de estudo", "Study goal"),
            body: tr(
              locale,
              `Faltam ${remaining} para sua meta de estudo com prazo em ${goal.due_at}.`,
              `${remaining} remaining for your study goal due ${goal.due_at}.`,
            ),
            route: goal.subject_id ? `/studies/${goal.subject_id}` : "/studies",
          }),
        );
      }
    }

    if (clock.hour === 18 && pref.journeys_enabled !== false) {
      const { data: missions } = await db
        .from("journey_missions")
        .select("id,journey_id,title,scheduled_date")
        .eq("user_id", pref.user_id)
        .eq("status", "active")
        .lte("scheduled_date", clock.day)
        .order("scheduled_date", { ascending: true })
        .limit(1);
      const mission = missions?.[0];
      if (mission) {
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `journey-mission:${mission.id}`,
            kind: "journeys",
            title: mission.title || tr(locale, "Sua Journey", "Your Journey"),
            body: tr(
              locale,
              "Você tem uma missão ativa pronta para continuar.",
              "You have an active mission ready to continue.",
            ),
            route: `/journeys/${mission.journey_id}`,
          }),
        );
      }
    }

    if (clock.hour === 18 && pref.challenges_enabled !== false) {
      const nowIso = now.toISOString();
      const { data: candidates } = await db
        .from("personal_challenges")
        .select("id,title,period,target_value,progress,ends_at")
        .eq("user_id", pref.user_id)
        .eq("status", "active")
        .lte("starts_at", nowIso)
        .gt("ends_at", nowIso)
        .order("ends_at", { ascending: true })
        .limit(10);
      const deadline = now.getTime() + 36 * 60 * 60 * 1000;
      const challenge = (candidates ?? []).find((item) => {
        const remaining = Number(item.target_value) - Number(item.progress ?? 0);
        if (remaining <= 0) return false;
        return item.period === "daily" || new Date(item.ends_at).getTime() <= deadline;
      });
      if (challenge) {
        const remaining = Math.max(
          1,
          Number(challenge.target_value) - Number(challenge.progress ?? 0),
        );
        queued += Number(
          await deliver({
            db,
            url,
            schedulerSecret,
            userId: pref.user_id,
            day: clock.day,
            dedupeKey: `challenge-reminder:${challenge.id}`,
            kind: "challenges",
            title: challenge.title ?? "KIVRYN Challenge",
            body: tr(
              locale,
              `Faltam ${remaining} para concluir seu desafio.`,
              `${remaining} remaining to complete your challenge.`,
            ),
            route: "/challenges",
          }),
        );
      }
    }

    if (clock.hour === 19 && pref.community_enabled !== false) {
      const { data: digests, error: digestError } = await db.rpc(
        "get_community_notification_digests",
        { p_user: pref.user_id },
      );
      if (!digestError && Array.isArray(digests)) {
        for (const digest of digests as Array<{
          channel_id?: string;
          name?: string;
          unread_count?: number;
          notification_mode?: string;
        }>) {
          if (!digest.channel_id || !digest.unread_count || digest.notification_mode === "muted")
            continue;
          const count = Number(digest.unread_count);
          queued += Number(
            await deliver({
              db,
              url,
              schedulerSecret,
              userId: pref.user_id,
              day: clock.day,
              dedupeKey: `community-digest:${digest.channel_id}`,
              kind: "community",
              title: digest.name ?? "KIVRYN Community",
              body: tr(
                locale,
                count === 1
                  ? "Você tem 1 nova mensagem na comunidade."
                  : `Você tem ${count} novas mensagens na comunidade.`,
                count === 1
                  ? "You have 1 new community message."
                  : `You have ${count} new community messages.`,
              ),
              route: `/community/${digest.channel_id}`,
            }),
          );
        }
      }
    }
  }

  return Response.json({ ok: true, queued });
});

async function buildDailySummary(
  db: any,
  userId: string,
  day: string,
  timezone: string,
  locale: "pt" | "en",
): Promise<string | null> {
  const [{ data: tasks }, { data: approvals }, { data: missions }, { data: goals }] =
    await Promise.all([
      db
        .from("tasks")
        .select("id,due_date")
        .eq("user_id", userId)
        .eq("completed", false)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(100),
      db
        .from("agent_runs")
        .select("id")
        .eq("user_id", userId)
        .eq("action_plan_status", "pending_approval")
        .limit(50),
      db
        .from("journey_missions")
        .select("id,scheduled_date")
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("scheduled_date", day)
        .limit(50),
      db
        .from("study_goals")
        .select("id,due_at")
        .eq("user_id", userId)
        .eq("completed", false)
        .lte("due_at", day)
        .limit(50),
    ]);

  let overdue = 0;
  let dueToday = 0;
  for (const task of tasks ?? []) {
    const taskDay = localDay(task.due_date, timezone);
    if (taskDay < day) overdue++;
    else if (taskDay === day) dueToday++;
  }

  const pieces: string[] = [];
  if (overdue)
    pieces.push(
      tr(locale, `${overdue} tarefa(s) atrasada(s)`, `${overdue} overdue task(s)`),
    );
  if (dueToday)
    pieces.push(
      tr(locale, `${dueToday} tarefa(s) vence(m) hoje`, `${dueToday} task(s) due today`),
    );
  if (approvals?.length)
    pieces.push(
      tr(
        locale,
        `${approvals.length} aprovação(ões) aguardando revisão`,
        `${approvals.length} approval(s) awaiting review`,
      ),
    );
  if (missions?.length)
    pieces.push(
      tr(
        locale,
        `${missions.length} missão(ões) de Journey ativa(s)`,
        `${missions.length} active Journey mission(s)`,
      ),
    );
  if (goals?.length)
    pieces.push(
      tr(
        locale,
        `${goals.length} meta(s) de estudo no prazo`,
        `${goals.length} study goal(s) due`,
      ),
    );

  if (!pieces.length) return null;
  return tr(locale, `Hoje: ${pieces.join(" · ")}.`, `Today: ${pieces.join(" · ")}.`);
}

async function deliver({
  db,
  url,
  schedulerSecret,
  userId,
  day,
  dedupeKey,
  kind,
  title,
  body,
  route,
}: {
  db: any;
  url: string;
  schedulerSecret: string;
  userId: string;
  day: string;
  dedupeKey: string;
  kind: string;
  title: string;
  body: string;
  route: string;
}): Promise<boolean> {
  const { error: dedupeError } = await db.from("notification_deliveries").insert({
    user_id: userId,
    dedupe_key: dedupeKey.slice(0, 240),
    kind: kind.slice(0, 80),
    delivered_on: day,
  });
  if (dedupeError) {
    if (dedupeError.code !== "23505")
      console.error("notification_dedupe_failed", { kind, code: dedupeError.code });
    return false;
  }

  const safeTitle = title.trim().slice(0, 120);
  const safeBody = body.trim().slice(0, 600);
  const { error: notificationError } = await db.from("notifications").insert({
    user_id: userId,
    type: kind.slice(0, 80),
    title: safeTitle,
    message: safeBody,
  });
  if (notificationError)
    console.error("notification_in_app_failed", { kind, code: notificationError.code });

  try {
    const response = await fetch(`${url}/functions/v1/push-send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-scheduler-secret": schedulerSecret,
      },
      body: JSON.stringify({
        userId,
        title: safeTitle,
        body: safeBody.slice(0, 240),
        url: route,
      }),
    });
    if (!response.ok) console.error("notification_push_failed", { kind, status: response.status });
  } catch {
    console.error("notification_push_request_failed", { kind });
  }
  // The reminder is considered queued once the server-owned dedupe claim exists.
  // Push acceptance remains transport evidence, not proof of physical delivery.
  return true;
}

function tr(locale: "pt" | "en", pt: string, en: string) {
  return locale === "en" ? en : pt;
}

function localClock(now: Date, timezone?: string | null) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    const year = value("year"), month = value("month"), day = value("day");
    const hour = Number(value("hour")), minute = Number(value("minute"));
    if (!year || !month || !day || !Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { day: `${year}-${month}-${day}`, hour, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

function localDay(value: string | null | undefined, timezone?: string | null) {
  if (!value) return "9999-12-31";
  try {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return "9999-12-31";
  }
}

function insideQuietHours(minutes: number, start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const parse = (value: string) => {
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
  };
  const from = parse(start), to = parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return true;
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayDistance(fromDay: string, toDay: string) {
  const from = new Date(`${fromDay}T00:00:00Z`).getTime();
  const to = new Date(`${toDay}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}
