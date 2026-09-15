export type KivrynContextScope =
  | "profile"
  | "preferences"
  | "tasks"
  | "projects"
  | "studies"
  | "passport";

type AdminClient = {
  from: (table: string) => any;
};

export type KivrynPersonalContext = {
  scopes: KivrynContextScope[];
  profile: null | {
    name: string | null;
    language: string | null;
    country: string | null;
    timezone: string | null;
    primaryGoal: string | null;
  };
  preferences: null | {
    language: string | null;
    timezone: string | null;
    dailyGoal: number | null;
    weekStart: string | null;
  };
  tasks: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  studies: Array<Record<string, unknown>>;
  passport: Array<Record<string, unknown>>;
  omittedScopes: KivrynContextScope[];
};

const BASE_SCOPES: readonly KivrynContextScope[] = ["profile", "preferences"];

const CAPABILITY_SCOPES: Record<string, readonly KivrynContextScope[]> = {
  productivity: ["tasks", "projects"],
  planning: ["tasks", "projects"],
  study: ["studies", "passport"],
};

function cleanText(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function compactRow(row: Record<string, unknown>, fields: Record<string, number>) {
  const output: Record<string, unknown> = {};
  for (const [field, max] of Object.entries(fields)) {
    const value = row[field];
    if (typeof value === "string") output[field] = cleanText(value, max);
    else if (typeof value === "boolean" || typeof value === "number" || value == null) output[field] = value;
  }
  return output;
}

export function resolveKivrynContextScopes(capabilities: unknown): KivrynContextScope[] {
  const scopes = new Set<KivrynContextScope>(BASE_SCOPES);
  if (!Array.isArray(capabilities)) return [...scopes];
  for (const capability of capabilities) {
    if (typeof capability !== "string") continue;
    for (const scope of CAPABILITY_SCOPES[capability] ?? []) scopes.add(scope);
  }
  return [...scopes];
}

async function safeLoad<T>(scope: KivrynContextScope, work: () => Promise<{ data: T; error?: unknown }>) {
  try {
    const result = await work();
    if (result.error) return { scope, ok: false as const, data: null };
    return { scope, ok: true as const, data: result.data };
  } catch {
    return { scope, ok: false as const, data: null };
  }
}

export async function loadKivrynPersonalContext(input: {
  admin: AdminClient;
  userId: string;
  capabilities: unknown;
}): Promise<KivrynPersonalContext> {
  const scopes = resolveKivrynContextScopes(input.capabilities);
  const requested = new Set(scopes);

  const loaders = [
    requested.has("profile")
      ? safeLoad("profile", async () =>
          input.admin
            .from("profiles")
            .select("full_name,language,country,timezone,primary_goal")
            .eq("id", input.userId)
            .maybeSingle())
      : null,
    requested.has("preferences")
      ? safeLoad("preferences", async () =>
          input.admin
            .from("user_preferences")
            .select("language,timezone,daily_goal,week_start,updated_at")
            .eq("user_id", input.userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle())
      : null,
    requested.has("tasks")
      ? safeLoad("tasks", async () =>
          input.admin
            .from("tasks")
            .select("id,title,due_date,completed,priority,project_id,execution_status,next_action,blocker_note,updated_at")
            .eq("user_id", input.userId)
            .order("updated_at", { ascending: false })
            .limit(20))
      : null,
    requested.has("projects")
      ? safeLoad("projects", async () =>
          input.admin
            .from("projects")
            .select("id,title,status,objective,priority,due_date,updated_at")
            .eq("user_id", input.userId)
            .order("updated_at", { ascending: false })
            .limit(12))
      : null,
    requested.has("studies")
      ? safeLoad("studies", async () =>
          input.admin
            .from("study_subjects")
            .select("id,name,status,objective,next_action,updated_at")
            .eq("user_id", input.userId)
            .order("updated_at", { ascending: false })
            .limit(12))
      : null,
    requested.has("passport")
      ? safeLoad("passport", async () =>
          input.admin
            .from("passport_profiles")
            .select("track_id,native_locale,goal,travel_date,daily_minutes,current_level,is_primary,updated_at")
            .eq("user_id", input.userId)
            .order("is_primary", { ascending: false })
            .order("updated_at", { ascending: false })
            .limit(4))
      : null,
  ].filter(Boolean) as Array<Promise<{ scope: KivrynContextScope; ok: boolean; data: any }>>;

  const loaded = await Promise.all(loaders);
  const byScope = new Map(loaded.map((entry) => [entry.scope, entry]));
  const omittedScopes = loaded.filter((entry) => !entry.ok).map((entry) => entry.scope);
  const profileRow = byScope.get("profile")?.data as Record<string, unknown> | null | undefined;
  const preferenceRow = byScope.get("preferences")?.data as Record<string, unknown> | null | undefined;
  const taskRows = (byScope.get("tasks")?.data ?? []) as Record<string, unknown>[];
  const projectRows = (byScope.get("projects")?.data ?? []) as Record<string, unknown>[];
  const studyRows = (byScope.get("studies")?.data ?? []) as Record<string, unknown>[];
  const passportRows = (byScope.get("passport")?.data ?? []) as Record<string, unknown>[];

  return {
    scopes,
    profile: profileRow
      ? {
          name: cleanText(profileRow.full_name, 120),
          language: cleanText(profileRow.language, 32),
          country: cleanText(profileRow.country, 80),
          timezone: cleanText(profileRow.timezone, 80),
          primaryGoal: cleanText(profileRow.primary_goal, 280),
        }
      : null,
    preferences: preferenceRow
      ? {
          language: cleanText(preferenceRow.language, 32),
          timezone: cleanText(preferenceRow.timezone, 80),
          dailyGoal: typeof preferenceRow.daily_goal === "number" ? preferenceRow.daily_goal : null,
          weekStart: cleanText(preferenceRow.week_start, 24),
        }
      : null,
    tasks: taskRows.map((row) => compactRow(row, {
      id: 64,
      title: 220,
      due_date: 40,
      priority: 24,
      project_id: 64,
      execution_status: 40,
      next_action: 280,
      blocker_note: 280,
      updated_at: 40,
    })),
    projects: projectRows.map((row) => compactRow(row, {
      id: 64,
      title: 220,
      status: 40,
      objective: 320,
      priority: 24,
      due_date: 40,
      updated_at: 40,
    })),
    studies: studyRows.map((row) => compactRow(row, {
      id: 64,
      name: 220,
      status: 40,
      objective: 320,
      next_action: 280,
      updated_at: 40,
    })),
    passport: passportRows.map((row) => compactRow(row, {
      track_id: 64,
      native_locale: 32,
      goal: 80,
      travel_date: 40,
      daily_minutes: 8,
      current_level: 8,
      updated_at: 40,
    })),
    omittedScopes,
  };
}

export function serializeKivrynPersonalContext(context: KivrynPersonalContext, maxChars = 7000) {
  const safe = {
    scopes: context.scopes,
    profile: context.profile,
    preferences: context.preferences,
    tasks: [...context.tasks],
    projects: [...context.projects],
    studies: [...context.studies],
    passport: [...context.passport],
    omittedScopes: context.omittedScopes,
  };
  let json = JSON.stringify(safe);
  while (json.length > maxChars) {
    const lists = [safe.tasks, safe.projects, safe.studies, safe.passport].filter((list) => list.length);
    if (!lists.length) break;
    lists.sort((a, b) => b.length - a.length)[0].pop();
    json = JSON.stringify(safe);
  }
  if (json.length > maxChars) {
    return JSON.stringify({
      scopes: safe.scopes,
      profile: safe.profile,
      preferences: safe.preferences,
      tasks: [],
      projects: [],
      studies: [],
      passport: [],
      omittedScopes: safe.omittedScopes,
    }).slice(0, maxChars);
  }
  return json;
}
