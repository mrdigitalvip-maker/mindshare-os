import { supabase } from "@/lib/supabase";

export type MobileAgent = {
  id: string;
  name: string;
  goal: string;
  description: string;
  active: boolean;
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

export async function listMobileAgents(): Promise<MobileAgent[]> {
  const uid = await userId();
  const { data, error } = await (supabase as any)
    .from("agents")
    .select("id,name,goal,description,active,schedule_frequency,schedule_time,schedule_weekdays,schedule_timezone,schedule_prompt,notify_on_run,next_run_at,last_run_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name ?? "KIVRYN Agent",
    goal: row.goal ?? "",
    description: row.description ?? "",
    active: row.active !== false,
    scheduleFrequency: row.schedule_frequency === "daily" || row.schedule_frequency === "weekly" ? row.schedule_frequency : null,
    scheduleTime: typeof row.schedule_time === "string" ? row.schedule_time.slice(0, 5) : null,
    scheduleWeekdays: Array.isArray(row.schedule_weekdays) ? row.schedule_weekdays.map(Number) : [],
    scheduleTimezone: row.schedule_timezone ?? null,
    schedulePrompt: row.schedule_prompt ?? null,
    notifyOnRun: row.notify_on_run !== false,
    nextRunAt: row.next_run_at ?? null,
    lastRunAt: row.last_run_at ?? null,
  }));
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
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.localTime)) throw new Error("Horário inválido. Use HH:MM.");
  if (!input.timezone.trim()) throw new Error("Fuso horário obrigatório.");
  if (!input.prompt.trim() || input.prompt.trim().length > 12000) throw new Error("Informe um briefing válido.");
  const weekdays = input.frequency === "weekly" ? [...new Set(input.weekdays)].sort() : null;
  if (input.frequency === "weekly" && !weekdays?.length) throw new Error("Escolha pelo menos um dia.");
  const { error } = await (supabase as any).rpc("configure_agent_schedule", {
    p_agent_id: input.agentId,
    p_frequency: input.frequency,
    p_local_time: input.localTime,
    p_weekdays: weekdays,
    p_timezone: input.timezone.trim(),
    p_prompt: input.prompt.trim(),
    p_notify: input.notifyOnRun,
  });
  if (error) throw error;
}

export async function clearMobileAgentSchedule(agentId: string) {
  await userId();
  const { data, error } = await (supabase as any).rpc("clear_agent_schedule", { p_agent_id: agentId });
  if (error) throw error;
  if (data !== true) throw new Error("Agendamento não encontrado.");
}
