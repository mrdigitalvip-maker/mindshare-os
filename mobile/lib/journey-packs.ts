import type { JourneyCategory } from "@/lib/journeys";

export type JourneyPack = {
  id: string;
  slug: string;
  version: number;
  title: string;
  shortDescription: string;
  description: string;
  category: Exclude<JourneyCategory, "custom">;
  durationDays: number | null;
  difficulty: "beginner" | "intermediate";
};
export type JourneyPackStep = {
  id: string;
  sequence: number;
  phase: string;
  title: string;
  description: string;
  required: boolean;
};
export type JourneyPackDetail = { pack: JourneyPack; steps: JourneyPackStep[] };

export const packErrorMessage = (message: string) => {
  if (message.includes("FREE_CREATION_LIMIT_REACHED") || message.includes("journey_limit_reached"))
    return "Seu plano Free permite uma Jornada ativa. Pause ou conclua a atual antes de iniciar outra.";
  if (message.includes("pack_retired") || message.includes("pack_not_available"))
    return "Este programa não está mais disponível para novas Jornadas.";
  if (message.includes("invalid_pack_input")) return "Revise o objetivo e a data informados.";
  if (message.includes("authentication_required"))
    return "Entre novamente para iniciar o programa.";
  return "Não foi possível iniciar o programa. Nada foi criado; tente novamente.";
};
