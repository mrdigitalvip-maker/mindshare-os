import type {
  KivrynAgentConnector,
  KivrynExternalAgentConnector,
} from "./kivryn-agent-connectors.ts";
import { resolveGoogleWorkspaceAccess } from "./google-workspace-access.ts";
import { readGoogleWorkspaceItems } from "./google-workspace-read.ts";

type AdminClient = {
  from: (table: string) => any;
};

export type KivrynAgentExternalContext = {
  connectors: Array<{
    id: KivrynExternalAgentConnector["id"];
    provider: KivrynExternalAgentConnector["provider"];
    items: Array<Record<string, unknown>>;
  }>;
  omittedConnectorIds: KivrynExternalAgentConnector["id"][];
};

export async function loadKivrynAgentExternalContext(input: {
  admin: AdminClient;
  userId: string;
  connectors: readonly KivrynAgentConnector[];
}): Promise<KivrynAgentExternalContext> {
  const external = input.connectors.filter(
    (connector): connector is KivrynExternalAgentConnector =>
      connector.kind === "external_oauth",
  );

  const loaded = await Promise.all(
    external.map(async (connector) => {
      try {
        const { accessToken } = await resolveGoogleWorkspaceAccess({
          admin: input.admin,
          userId: input.userId,
          provider: connector.provider,
          capability: connector.capability,
        });
        const items = await readGoogleWorkspaceItems({
          provider: connector.provider,
          accessToken,
          limit: 3,
        });
        return {
          ok: true as const,
          connector: {
            id: connector.id,
            provider: connector.provider,
            items: items as Array<Record<string, unknown>>,
          },
        };
      } catch {
        return { ok: false as const, id: connector.id };
      }
    }),
  );

  return {
    connectors: loaded
      .filter((entry): entry is Extract<typeof entry, { ok: true }> => entry.ok)
      .map((entry) => entry.connector),
    omittedConnectorIds: loaded
      .filter((entry): entry is Extract<typeof entry, { ok: false }> => !entry.ok)
      .map((entry) => entry.id),
  };
}

export function serializeKivrynAgentExternalContext(
  context: KivrynAgentExternalContext,
  maxChars = 4500,
) {
  const safe = {
    connectors: context.connectors.map((connector) => ({
      id: connector.id,
      provider: connector.provider,
      items: [...connector.items],
    })),
    omittedConnectorIds: [...context.omittedConnectorIds],
  };

  let json = JSON.stringify(safe);
  while (json.length > maxChars) {
    const withItems = safe.connectors.filter((connector) => connector.items.length);
    if (!withItems.length) break;
    withItems.sort((a, b) => b.items.length - a.items.length)[0].items.pop();
    json = JSON.stringify(safe);
  }
  if (json.length <= maxChars) return json;
  return JSON.stringify({
    connectors: safe.connectors.map(({ id, provider }) => ({ id, provider, items: [] })),
    omittedConnectorIds: safe.omittedConnectorIds,
  }).slice(0, maxChars);
}
