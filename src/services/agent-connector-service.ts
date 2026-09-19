import type { IntegrationProviderStatus } from "./integration-status-service";

export type WebAgentExternalConnectorId =
  | "google.gmail"
  | "google.calendar"
  | "google.drive";

export type WebAgentExternalConnector = {
  id: WebAgentExternalConnectorId;
  provider: "gmail" | "google_calendar" | "google_drive";
  name: string;
  description: string;
};

export const WEB_AGENT_EXTERNAL_CONNECTORS: readonly WebAgentExternalConnector[] = [
  {
    id: "google.gmail",
    provider: "gmail",
    name: "Gmail",
    description: "Lê metadados recentes de emails como contexto do Agent.",
  },
  {
    id: "google.calendar",
    provider: "google_calendar",
    name: "Google Calendar",
    description: "Lê próximos eventos do calendário como contexto do Agent.",
  },
  {
    id: "google.drive",
    provider: "google_drive",
    name: "Google Drive",
    description: "Lê metadados de arquivos recentes como contexto do Agent.",
  },
] as const;

export function externalConnectorStatus(
  connector: WebAgentExternalConnector,
  providers: readonly IntegrationProviderStatus[] | undefined,
) {
  const provider = providers?.find((item) => item.provider === connector.provider);
  if (!provider) return "unknown" as const;
  if (!provider.runtimeConfigured) return "configuration_required" as const;
  if (provider.connectionStatus === "connected") return "connected" as const;
  return "not_connected" as const;
}
