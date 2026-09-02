import { describe, expect, test } from "bun:test";
import {
  formatMessageDate,
  messageActions,
  profileValidation,
  withDateSeparators,
} from "../lib/community-ui";
import type { CommunityMessage } from "../lib/community";
const message = (id: string, createdAt: string): CommunityMessage => ({
  id,
  createdAt,
  body: id,
  actorType: "user",
  senderPublicId: "real",
  displayName: "Real User",
  avatarUrl: null,
  isSelf: false,
  removed: false,
  replyToId: null,
  reactions: {},
  myReaction: null,
  clientRequestId: null,
});
describe("Community presentation derives only from persisted truth", () => {
  test("Today and Yesterday are deterministic", () => {
    const now = new Date(2026, 7, 31, 12);
    expect(formatMessageDate("2026-08-31T08:00:00", now)).toBe("Hoje");
    expect(formatMessageDate("2026-08-30T08:00:00", now)).toBe("Ontem");
    expect(formatMessageDate("2025-08-30T08:00:00", now)).toContain("2025");
  });
  test("same-day messages share one separator without timestamp rewriting", () => {
    const rows = withDateSeparators([
      message("a", "2026-08-30T08:00:00Z"),
      message("b", "2026-08-30T20:00:00Z"),
    ]);
    expect(rows.filter((row) => row.kind === "date")).toHaveLength(1);
    expect(
      rows.filter((row) => row.kind === "message").map((row) => row.message.createdAt),
    ).toEqual(["2026-08-30T08:00:00Z", "2026-08-30T20:00:00Z"]);
  });
  test("system and self messages cannot expose block actions", () => {
    expect(messageActions({ ...message("host", "2026-08-30"), actorType: "system" }).canBlock).toBe(
      false,
    );
    expect(messageActions({ ...message("me", "2026-08-30"), isSelf: true }).canBlock).toBe(false);
    expect(messageActions(message("human", "2026-08-30")).canBlock).toBe(true);
  });
  test("username validation matches backend format", () => {
    expect(profileValidation("Nome", "abc_123", true)).toBeNull();
    expect(profileValidation("Nome", "1abc", true)).not.toBeNull();
    expect(profileValidation("", "abc", true)).not.toBeNull();
  });
});
