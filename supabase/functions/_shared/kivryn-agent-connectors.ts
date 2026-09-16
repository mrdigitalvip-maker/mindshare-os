import type { KivrynAgentSkill, KivrynContextScope } from "./kivryn-agent-skills.ts";

export const KIVRYN_CONNECTOR_REGISTRY_VERSION = 1 as const;

export type KivrynAgentConnector = {
  id: "workspace.tasks" | "workspace.projects" | "workspace.studies" | "workspace.documents";
  name: string;
  version: 1;
  kind: "internal_context";
  readScopes: readonly KivrynContextScope[];
  canMutate: false;
};

const REGISTRY: readonly KivrynAgentConnector[] = [
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

/**
 * Connectors are KIVRYN-owned context adapters. They never grant action authority.
 * External OAuth/MCP connectors must be explicitly added to this registry later;
 * the model cannot invent or activate one from prompt text.
 */
export function resolveKivrynAgentConnectors(skills: readonly KivrynAgentSkill[]) {
  const readable = new Set(skills.flatMap((skill) => [...skill.contextScopes]));
  return REGISTRY.filter((connector) => connector.readScopes.some((scope) => readable.has(scope)));
}

export function serializeKivrynAgentConnectors(connectors: readonly KivrynAgentConnector[]) {
  return JSON.stringify({
    registryVersion: KIVRYN_CONNECTOR_REGISTRY_VERSION,
    connectors: connectors.map((connector) => ({
      id: connector.id,
      name: connector.name,
      kind: connector.kind,
      readScopes: connector.readScopes,
      canMutate: false,
    })),
  }).slice(0, 2500);
}
