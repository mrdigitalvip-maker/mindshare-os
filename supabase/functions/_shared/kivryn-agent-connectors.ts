import type { KivrynAgentSkill, KivrynContextScope } from "./kivryn-agent-skills.ts";
import type {
  KivrynIntegrationCapability,
  KivrynIntegrationProvider,
} from "./kivryn-integration-registry.ts";

export const KIVRYN_CONNECTOR_REGISTRY_VERSION = 1 as const;

export type KivrynInternalAgentConnector = {
  id: "workspace.tasks" | "workspace.projects" | "workspace.studies" | "workspace.documents";
  name: string;
  version: 1;
  kind: "internal_context";
  readScopes: readonly KivrynContextScope[];
  canMutate: false;
};

export type KivrynExternalAgentConnector = {
  id: "google.gmail" | "google.calendar" | "google.drive";
  name: string;
  version: 1;
  kind: "external_oauth";
  provider: Extract<KivrynIntegrationProvider, "gmail" | "google_calendar" | "google_drive">;
  capability: Extract<KivrynIntegrationCapability, "mail.read" | "calendar.read" | "files.read">;
  canMutate: false;
};

export type KivrynAgentConnector = KivrynInternalAgentConnector | KivrynExternalAgentConnector;
export type KivrynExternalAgentConnectorId = KivrynExternalAgentConnector["id"];

const INTERNAL_REGISTRY: readonly KivrynInternalAgentConnector[] = [
  {
    id: "workspace.tasks",
    name: "Tasks Context",
    version: 1,
    kind: "internal_context",
    readScopes: ["tasks"],
    canMutate: false,
  },
  {
    id: "workspace.projects",
    name: "Projects Context",
    version: 1,
    kind: "internal_context",
    readScopes: ["projects"],
    canMutate: false,
  },
  {
    id: "workspace.studies",
    name: "Studies Context",
    version: 1,
    kind: "internal_context",
    readScopes: ["studies", "passport"],
    canMutate: false,
  },
  {
    id: "workspace.documents",
    name: "Documents Context",
    version: 1,
    kind: "internal_context",
    readScopes: ["documents"],
    canMutate: false,
  },
];

const EXTERNAL_REGISTRY: readonly KivrynExternalAgentConnector[] = [
  {
    id: "google.gmail",
    name: "Gmail Context",
    version: 1,
    kind: "external_oauth",
    provider: "gmail",
    capability: "mail.read",
    canMutate: false,
  },
  {
    id: "google.calendar",
    name: "Google Calendar Context",
    version: 1,
    kind: "external_oauth",
    provider: "google_calendar",
    capability: "calendar.read",
    canMutate: false,
  },
  {
    id: "google.drive",
    name: "Google Drive Context",
    version: 1,
    kind: "external_oauth",
    provider: "google_drive",
    capability: "files.read",
    canMutate: false,
  },
];

export const KIVRYN_EXTERNAL_AGENT_CONNECTORS = EXTERNAL_REGISTRY;

function selectedExternalIds(value: unknown) {
  if (!Array.isArray(value)) return new Set<KivrynExternalAgentConnectorId>();
  const known = new Set(EXTERNAL_REGISTRY.map((connector) => connector.id));
  return new Set(
    value.filter(
      (id): id is KivrynExternalAgentConnectorId =>
        typeof id === "string" && known.has(id as KivrynExternalAgentConnectorId),
    ),
  );
}

/**
 * Internal connectors are derived from specialized skills. External connectors
 * additionally require the explicit integrations capability plus a persisted
 * user selection. Connector reads never grant mutation authority.
 */
export function resolveKivrynAgentConnectors(
  skills: readonly KivrynAgentSkill[],
  externalConnectorIds: unknown = [],
): KivrynAgentConnector[] {
  const readable = new Set(skills.flatMap((skill) => [...skill.contextScopes]));
  const internal = INTERNAL_REGISTRY.filter((connector) =>
    connector.readScopes.some((scope) => readable.has(scope)),
  );
  const hasIntegrationAuthority = skills.some((skill) => skill.capability === "integrations");
  if (!hasIntegrationAuthority) return [...internal];

  const selected = selectedExternalIds(externalConnectorIds);
  return [
    ...internal,
    ...EXTERNAL_REGISTRY.filter((connector) => selected.has(connector.id)),
  ];
}

export function serializeKivrynAgentConnectors(connectors: readonly KivrynAgentConnector[]) {
  return JSON.stringify({
    registryVersion: KIVRYN_CONNECTOR_REGISTRY_VERSION,
    connectors: connectors.map((connector) =>
      connector.kind === "internal_context"
        ? {
            id: connector.id,
            name: connector.name,
            kind: connector.kind,
            readScopes: connector.readScopes,
            canMutate: false,
          }
        : {
            id: connector.id,
            name: connector.name,
            kind: connector.kind,
            provider: connector.provider,
            capability: connector.capability,
            canMutate: false,
          },
    ),
  }).slice(0, 3500);
}
