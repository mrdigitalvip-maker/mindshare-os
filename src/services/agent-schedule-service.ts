import { supabase } from "@/lib/supabase";
import { getRequiredUserId } from "./supabase-service";

export type AgentSchedule = {
  agentId: string;
  frequency: "daily" | "weekly" | null;
  localTime: string | null;
  weekdays: number[];
  timezone: string | null;
  prompt: string | null;
  notifyOnRun: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
};

const db = supabase as any;

function map(row: any): AgentSchedule {
  return {
    agentId: row.id,
    frequency: row.schedule_frequency === "daily" || row.schedule_frequency === "weekly" ? row.schedule_frequency : null,
    localTime: typeof row.schedule_time === "string" ? row.schedule_time.slice(0, 5) : null,
    weekdays: Array.isArray(row.schedule_weekdays) ? row.schedule_weekdays.map(Number) : [],
    timezone: row.schedule_timezone ?? null,
    prompt: row.schedule_prompt ?? null,
    notifyOnRun: row.notify_on_run !== false,
    nextRunAt: row.next_run_at ?? null,
    lastRunAt: row.last_run_at ?? null,
  };
}

export const AgentScheduleService = {
  async get(agentId: string): Promise<AgentSchedule | null> {
    const userId = await getRequiredUserId();
    const { data, error } = await db
      .from("agents")
      .select("id,schedule_frequency,schedule_time,schedule_weekdays,schedule_timezone,schedule_prompt,notify_on_run,next_run_at,last_run_at")
      .eq("id", agentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? map(data) : null;
  },

  async configure(input: {
    agentId: string;
    frequency: "daily" | "weekly";
    localTime: string;
    weekdays?: number[];
    timezone: string;
    prompt: string;
    notifyOnRun: boolean;
  }): Promise<AgentSchedule> {
    await getRequiredUserId();
    const prompt = input.prompt.trim();
    const timezone = input.timezone.trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.localTime)) throw new Error("Use um horário válido no formato HH:MM.");
    if (!timezone) throw new Error("Informe um fuso horário IANA válido.");
    if (!prompt || prompt.length > 12000) throw new Error("O briefing precisa ter entre 1 e 12000 caracteres.");
    const weekdays = input.frequency === "weekly" ? [...new Set(input.weekdays ?? [])].sort() : null;
    if (input.frequency === "weekly" && (!weekdays?.length || weekdays.some((day) => day < 1 || day > 7)))
      throw new Error("Escolha pelo menos um dia da semana.");

    const { data, error } = await db.rpc("configure_agent_schedule", {
      p_agent_id: input.agentId,
      p_frequency: input.frequency,
      p_local_time: input.localTime,
      p_weekdays: weekdays,
      p_timezone: timezone,
      p_prompt: prompt,
      p_notify: input.notifyOnRun,
    });
    if (error) throw error;
    if (!Array.isArray(data) || !data[0]?.agent_id) throw new Error("O agendamento não pôde ser salvo.");
    const schedule = await this.get(input.agentId);
    if (!schedule) throw new Error("Agente não encontrado após salvar o agendamento.");
    return schedule;
  },

  async clear(agentId: string): Promise<void> {
    await getRequiredUserId();
    const { data, error } = await db.rpc("clear_agent_schedule", { p_agent_id: agentId });
    if (error) throw error;
    if (data !== true) throw new Error("Agendamento não encontrado.");
  },
};
