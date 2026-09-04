import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import {
  copyCommunityText,
  messageActions,
  normalizeCommunityProfile,
  normalizeCommunityUsername,
  profileValidation,
} from "../lib/community-ui";
import { reconcileCommunityMessages } from "../lib/community-message";
import type { CommunityMessage } from "../lib/community";
import { translations } from "../i18n";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const home = source("../app/(app)/community/index.tsx");
const chat = source("../app/(app)/community/[channelId].tsx");
const hooks = source("../hooks/use-community.ts");
const service = source("../services/community-service.ts");
const squad = source("../app/(app)/community/squads/[squadId].tsx");
const msg = (id: string, overrides: Partial<CommunityMessage> = {}): CommunityMessage => ({
  id,
  clientRequestId: null,
  body: id,
  createdAt: "2026-09-01T10:00:00Z",
  actorType: "user",
  senderPublicId: "real-user",
  displayName: "Pessoa real",
  avatarUrl: null,
  isSelf: false,
  removed: false,
  replyToId: null,
  reactions: {},
  myReaction: null,
  ...overrides,
});

describe("Community revision 11 — persisted social truth", () => {
  test("home sections are isolated and follow the execution hierarchy", () => {
    expect(home).toContain("channels.isError");
    expect(home.indexOf('copyKey="legacy.a2c509954b40"')).toBeLessThan(
      home.indexOf('copyKey="legacy.21d9191b0740"'),
    );
    expect(home.indexOf('copyKey="legacy.27018f233ea5"')).toBeLessThan(
      home.indexOf('copyKey="legacy.b8512a2d9d1c"'),
    );
    expect(home).toContain('copyKey="legacy.bccd0f29e3f9"');
    expect((translations["pt-BR"] as Record<string, string>)["legacy.bccd0f29e3f9"]).toBe(
      "Nenhuma atividade verificada compartilhada ainda.",
    );
    expect((translations.en as Record<string, string>)["legacy.bccd0f29e3f9"]).toBe(
      "No verified activity has been shared yet.",
    );
    expect(home).not.toMatch(/pessoas online|membros ativos|ranking/i);
  });
  test("official channels expose only canonical eligibility and latest body", () => {
    expect(home).toContain("channel.recentBody");
    expect(home).toContain("hasActiveOfficialMembership(channel)");
    expect(home).toContain("Indisponível no seu plano");
    expect(home).not.toContain("Community+ bloqueada");
  });
  test("profile normalization, validation, privacy, and synchronous guard are explicit", () => {
    expect(normalizeCommunityUsername("  @@Nome_2 ")).toBe("nome_2");
    expect(
      normalizeCommunityProfile({ displayName: " Ana ", username: " @ANA ", bio: " oi " }),
    ).toEqual({ displayName: "Ana", username: "ana", bio: "oi" });
    expect(profileValidation("Ana", "ana", true)).toBeNull();
    expect(profileValidation("", "ana", true)).not.toBeNull();
    expect(home).toContain("savingProfile.current");
    expect(home).not.toContain('label="Compartilhar streak"');
    expect(service).toContain("p_show_streak: clean.showStreak");
  });
  test("activity is canonical, empty-state honest, and rapid reactions guarded", () => {
    expect(service).toContain('rpc<Record<string, unknown>>("get_community_home"');
    expect(home).toContain("reactingActivity.current.has(a.id)");
    expect(home).toContain("a.reactions[r] ?? 0");
  });
  test("chat preserves idempotent send/reply and reconciles overlapping pages", () => {
    expect(chat).toContain("sending.current");
    expect(chat).toContain("send(failed.body, failed.requestId, failed.replyToId)");
    expect(service).toContain("p_client_request_id: requestId");
    expect(service).toContain("p_reply_to: replyToId ?? null");
    expect(reconcileCommunityMessages([[msg("a")], [msg("a")]])).toHaveLength(1);
    expect(service).toContain("removeChannel(channel)");
  });
  test("message actions exclude self and automated Host moderation", () => {
    expect(messageActions(msg("self", { isSelf: true })).canReport).toBe(false);
    expect(
      messageActions(msg("host", { actorType: "system", senderPublicId: null })).canBlock,
    ).toBe(false);
    expect(messageActions(msg("real")).canBlock).toBe(true);
    expect(chat).toContain('copyKey="legacy.5f89039a541b"');
    expect((translations["pt-BR"] as Record<string, string>)["legacy.5f89039a541b"]).toBe(
      "AUTOMÁTICO",
    );
    expect((translations.en as Record<string, string>)["legacy.5f89039a541b"]).toBe("AUTOMATIC");
    expect(chat).toContain("reporting.current.has(selected.id)");
  });
  test("clipboard path is safe when native support is missing or throws", async () => {
    expect(await copyCommunityText("real", false, undefined)).toBe(false);
    expect(
      await copyCommunityText("real", false, {
        setStringAsync: async () => {
          throw new Error("native");
        },
      }),
    ).toBe(false);
    let copied = "";
    expect(
      await copyCommunityText("real", false, {
        setStringAsync: async (value) => {
          copied = value;
        },
      }),
    ).toBe(true);
    expect(copied).toBe("real");
  });
  test("Squad and invite actions use canonical responses and duplicate guards", () => {
    expect(home).toContain("creatingSquad.current");
    expect(home).toContain("joiningSquad.current");
    expect(service).toContain("code.trim().toUpperCase()");
    expect(home).toContain("s.memberCount");
    expect(squad).toContain('s.role === "owner"');
    expect(squad).not.toMatch(/fake|exemplo|demo/i);
  });
  test("notification state remains backend canonical", () => {
    expect(chat).toContain("channel.notificationMode === mode");
    expect(chat).toContain("channelActions.notifications.isPending");
    expect(hooks).toContain("onSuccess: done");
    expect(chat).not.toMatch(/push (ativado|garantido)/i);
  });
});
