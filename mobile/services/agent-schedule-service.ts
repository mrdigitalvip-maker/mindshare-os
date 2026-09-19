import { supabase } from "@/lib/supabase";
import {
  resolveMobileAgentSkills,
  type MobileAgentSkill,
} from "@/services/agent-skill-service";

export type MobileContextScope =
  | "profile"
  | "preferences"
  | "tasks"
  | "projects"
  | "studies"
  | "passport";

export function contextScopesForAgentCapabilities(capabilities: string[]): MobileContextScope[] {
  const scopes = new Set<MobileContextScope>(["profile", "preferences"]);
  if (capabilities.includes("planning") || capabilities.includes("productivity")) {
    scopes.add("tasks");
    scopes.add("projects");
  }
  if (capabilities.includes("study")) {
    scopes.add("studies");
    scopes.add("passport");
  }
  return [...scopes];
}

export type MobileAgent = {
  id: string;
  name: string;
  goal: string;
  description: string;
  active: boolean;
  capabilities: string[];
  externalConnectorIds: string[];
  skills: MobileAgentSkill[];
  contextScopes: MobileContextScope[];
  scheduleFrequency: "daily" | "weekly" | null;
  scheduleTime: string | null;
  scheduleWeekdays: number[];
  scheduleTimezone: string | null;
  schedulePrompt: string | null;
  notifyOnRun: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
};

async function userId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão autenticada necessária.");
  return data.user.id;
}

function throwScheduleError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("premium_required"))
    throw new Error("Agendamentos de Agents exigem Premium ativo.");
  if (message.includes("invalid_schedule_timezone"))
    throw new Error("Informe um fuso horário IANA válido.");
  if (message.includes("agent_not_found"))
    throw new Error("Agent não encontrado ou sem permissão.");
  throw error instanceof Error ? error : new Error("Não foi possível atualizar o agendamento.");
}

export async function listMobileAgents(): Promise<MobileAgent[]> {
  const uid = await userId();
  const { data, error } = await (supabase as any)
    .from("agents")
    .select(
      "id,name,goal,description,active,capabilities,external_connector_ids,schedule_frequency,schedule_time,schedule_weekdays,schedule_timezone,schedule_prompt,notify_on_run,next_run_at,last_run_at",
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const capabilities = Array.isArray(row.capabilities)
      ? row.capabilities.filter((value: unknown): value is string => typeof value === "string")
      : [];
    return {
      id: row.id,
      name: row.name ?? "KIVRYN Agent",
      goal: row.goal ?? "",
      description: row.description ?? "",
      active: row.active !== false,
      capabilities,
      externalConnectorIds: Array.isArray(row.external_connector_ids)
        ? row.external_connector_ids.filter(
            (value: unknown): value is string => typeof value === "string",
          )
        : [],
      skills: resolveMobileAgentSkills(capabilities),
      contextScopes: contextScopesForAgentCapabilities(capabilities),
      scheduleFrequency:
        row.schedule_frequency === "daily" || row.schedule_frequency === "weekly"
          ? row.schedule_frequency
          : null,
      scheduleTime: typeof row.schedule_time === "string" ? row.schedule_time.slice(0, 5) : null,
      scheduleWeekdays: Array.isArray(row.schedule_weekdays) ? row.schedule_weekdays.map(Number) : [],
      scheduleTimezone: row.schedule_timezone ?? null,
      schedulePrompt: row.schedule_prompt ?? null,
      notifyOnRun: row.notify_on_run !== false,
      nextRunAt: row.next_run_at ?? null,
      lastRunAt: row.last_run_at ?? null,
    };
  });
}

export async function configureMobileAgentSchedule(input: {
  agentId: string;
  frequency: "daily" | "weekly";
  localTime: string;
  weekdays: number[];
  timezone: string;
  prompt: string;
  notifyOnRun: boolean;
}) {
  await userId();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.localTime))
    throw new Error("Horário inválido. Use HH:MM.");
  if (!input.timezone.trim()) throw new Error("Fuso horário obrigatório.");
  if (!input.prompt.trim() || input.prompt.trim().length > 12000)
    throw new Error("Informe um briefing válido.");
  const weekdays =
    input.frequency === "weekly"
      ? [...new Set(input.weekdays)].sort((a, b) => a - b)
      : null;
  if (
    input.frequency === "weekly" &&
    (!weekdays?.length || weekdays.some((day) => day < 1 || day > 7))
  )
    throw new Error("Escolha pelo menos um dia.");
  const { error } = await (supabase as any).rpc("configure_agent_schedule", {
    p_agent_id: input.agentId,
    p_frequency: input.frequency,
    p_local_time: input.localTime,
    p_weekdays: weekdays,
    p_timezone: input.timezone.trim(),
    p_prompt: input.prompt.trim(),
    p_notify: input.notifyOnRun,
  });
  if (error) throwScheduleError(error);
}

export async function clearMobileAgentSchedule(agentId: string) {
  await userId();
  const { data, error } = await (supabase as any).rpc("clear_agent_schedule", {
    p_agent_id: agentId,
  });
  if (error) throwScheduleError(error);
  if (data !== true) throw new Error("Agendamento não encontrado.");
}
