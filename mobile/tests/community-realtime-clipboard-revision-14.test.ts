import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { copyCommunityText, messageActions } from "../lib/community-ui";
import {
  createCommunityRealtimeLifecycle,
  type CommunityRealtimeStatus,
} from "../lib/community-realtime";
import { reconcileCommunityMessages } from "../lib/community-message";
import type { CommunityMessage } from "../lib/community";

const conversation = readFileSync(
  fileURLToPath(new URL("../app/(app)/community/[channelId].tsx", import.meta.url)),
  "utf8",
);
const hooks = readFileSync(fileURLToPath(new URL("../hooks/use-community.ts", import.meta.url)), "utf8");
const service = readFileSync(
  fileURLToPath(new URL("../services/community-service.ts", import.meta.url)),
  "utf8",
);

const message = (id: string, removed = false): CommunityMessage => ({
  id,
  clientRequestId: null,
  body: removed ? "Mensagem removida." : "conteúdo",
  createdAt: "2026-09-03T00:00:00Z",
  actorType: "user",
  senderPublicId: "sender",
  displayName: "Pessoa",
  avatarUrl: null,
  isSelf: false,
  removed,
  replyToId: null,
  reactions: {},
  myReaction: null,
});

function harness() {
  let callback: ((status: CommunityRealtimeStatus) => void) | undefined;
  let subscriptions = 0;
  let cleanups = 0;
  let reconciliations = 0;
  const statuses: CommunityRealtimeStatus[] = [];
  const scheduled: (() => void)[] = [];
  const lifecycle = createCommunityRealtimeLifecycle({
    subscribe: (next) => {
      subscriptions += 1;
      callback = next;
      let cleaned = false;
      return () => {
        if (!cleaned) cleanups += 1;
        cleaned = true;
      };
    },
    reconcile: () => {
      reconciliations += 1;
    },
    status: (status) => statuses.push(status),
    scheduler: {
      set: (_delay, task) => {
        scheduled.push(task);
        return task;
      },
      clear: (task) => {
        const index = scheduled.indexOf(task as () => void);
        if (index >= 0) scheduled.splice(index, 1);
      },
    },
  });
  return {
    lifecycle,
    emit: (status: CommunityRealtimeStatus) => callback?.(status),
    runRetry: () => scheduled.shift()?.(),
    stats: () => ({ subscriptions, cleanups, reconciliations, statuses }),
  };
}

describe("NXR-026 clipboard", () => {
  test("supported async clipboard reports success and failures remain non-fatal", async () => {
    let copied = "";
    expect(
      await copyCommunityText("conteúdo", false, {
        setStringAsync: async (value) => {
          copied = value;
        },
      }),
    ).toBe(true);
    expect(copied).toBe("conteúdo");
    expect(
      await copyCommunityText("conteúdo", false, {
        setStringAsync: async () => {
          throw new Error("native detail must not escape");
        },
      }),
    ).toBe(false);
  });

  test("removed messages cannot expose or copy their original text", async () => {
    let calls = 0;
    expect(messageActions(message("removed", true)).canCopy).toBe(false);
    expect(
      await copyCommunityText("hidden original", true, {
        setStringAsync: async () => {
          calls += 1;
        },
      }),
    ).toBe(false);
    expect(calls).toBe(0);
  });

  test("conversation uses truthful, product-safe clipboard feedback", () => {
    expect(conversation).toContain("Mensagem copiada.");
    expect(conversation).toContain("Não foi possível copiar a mensagem.");
    expect(conversation).not.toContain("NativeModules.Clipboard");
  });
});

describe("NXR-026 realtime lifecycle", () => {
  test("mount owns one subscription and unmount cleanup is idempotent", () => {
    const h = harness();
    h.lifecycle.start();
    h.lifecycle.start();
    expect(h.stats().subscriptions).toBe(1);
    expect(h.stats().statuses).toEqual(["connecting"]);
    h.lifecycle.stop();
    h.lifecycle.stop();
    expect(h.stats().cleanups).toBe(1);
  });

  test("only SUBSCRIBED-equivalent connected state claims connected", () => {
    const h = harness();
    h.lifecycle.start();
    h.emit("connected");
    expect(h.stats().statuses.at(-1)).toBe("connected");
    expect(h.stats().reconciliations).toBe(1);
    for (const terminal of ["error", "error", "disconnected"] as const) {
      h.emit(terminal);
      expect(h.stats().statuses.at(-1)).toBe(terminal);
    }
    expect(service).toContain('status === "CHANNEL_ERROR" || status === "TIMED_OUT"');
    expect(service).toContain('status === "CLOSED"');
  });

  test("background disconnects and foreground reconciles canonical data before remount", () => {
    const h = harness();
    h.lifecycle.start();
    h.emit("connected");
    h.lifecycle.setForeground(false);
    expect(h.stats().statuses.at(-1)).toBe("disconnected");
    expect(h.stats().cleanups).toBe(1);
    h.lifecycle.setForeground(true);
    expect(h.stats().subscriptions).toBe(2);
    expect(h.stats().reconciliations).toBe(2);
    expect(hooks).toContain('AppState.addEventListener("change"');
  });

  test("terminal recovery replaces rather than accumulates subscriptions", () => {
    const h = harness();
    h.lifecycle.start();
    h.emit("error");
    h.runRetry();
    expect(h.stats().subscriptions).toBe(2);
    expect(h.stats().cleanups).toBe(1);
  });

  test("stale channel and post-unmount callbacks are ignored", () => {
    const first = harness();
    first.lifecycle.start();
    const staleEmit = first.emit;
    first.lifecycle.stop();
    const second = harness();
    second.lifecycle.start();
    staleEmit("connected");
    expect(first.stats().reconciliations).toBe(0);
    expect(second.stats().reconciliations).toBe(0);
  });

  test("message and reaction events refresh only canonical channel query state", () => {
    expect(service).toContain('table: "community_messages"');
    expect(service).toContain('filter: `channel_id=eq.${channelId}`');
    expect(service).toContain('table: "community_message_reactions"');
    expect(hooks).toContain("queryKeys.communityMessages(channelId)");
    expect(hooks).not.toContain("setQueryData");
    expect(reconcileCommunityMessages([[message("same")], [message("same")]])).toHaveLength(1);
  });
});
