export type MobileAgentExternalConnectorId =
  | "google.gmail"
  | "google.calendar"
  | "google.drive";

export const MOBILE_AGENT_EXTERNAL_CONNECTORS: ReadonlyArray<{
  id: MobileAgentExternalConnectorId;
  name: string;
}> = [
  { id: "google.gmail", name: "Gmail" },
  { id: "google.calendar", name: "Google Calendar" },
  { id: "google.drive", name: "Google Drive" },
];

export function mobileAgentConnectorName(id: string) {
  return MOBILE_AGENT_EXTERNAL_CONNECTORS.find((connector) => connector.id === id)?.name ?? id;
}
