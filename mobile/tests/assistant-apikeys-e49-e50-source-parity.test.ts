import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const e49 = source("../../supabase/migrations/202609180027_e49_assistant_history_rls.sql");
const e50 = source("../../supabase/migrations/202609180028_e50_api_keys_rls_index.sql");
const chat = source("../services/chat-service.ts");

describe("E49/E50 Assistant and API key shared-backend parity", () => {
  test("Android Assistant keeps canonical conversation history and ai-chat runtime", () => {
    expect(chat).toContain('.from("ai_conversations")');
    expect(chat).toContain('"ai-chat"');
    expect(e49).toContain("conversation_all");
    expect(e49).toContain("messages_all");
    expect(e49).toContain("c.user_id = (select auth.uid())");
  });

  test("API key hardening is owner-only and never handles secret material in migration", () => {
    expect(e50).toContain("api_keys_user_id_idx");
    expect(e50).toContain("api_keys_all");
    expect(e50).toContain("(select auth.uid())");
    expect(e50.toLowerCase()).not.toContain("drop index");
    expect(e50.toLowerCase()).not.toContain("security definer");
  });
});
