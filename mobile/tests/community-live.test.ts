import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
const sql = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/202608290006_community_live.sql", import.meta.url),
  ),
  "utf8",
).toLowerCase();
const service = readFileSync(
  fileURLToPath(new URL("../services/community-service.ts", import.meta.url)),
  "utf8",
);
describe("Community Live server contract", () => {
  test("official access is server authoritative", () => {
    expect(sql).toContain("'nexora-community','nexora community',false");
    expect(sql).toContain("public.has_premium(uid)");
    expect(sql).toContain("premium_required");
  });
  test("membership and restrictions gate posting", () => {
    expect(sql).toContain("membership_required");
    expect(sql).toContain("membership_restricted");
  });
  test("Host is privileged, bounded and idempotent", () => {
    expect(sql).toContain("auth.role()<>'service_role'");
    expect(sql).toContain("unique(channel_id,host_key)");
    expect(sql).toContain("state.sent_count>=2");
  });
  test("send is idempotent, rate limited and paginated", () => {
    expect(sql).toContain("unique(user_id,client_request_id)");
    expect(sql).toContain("limit least(greatest(p_limit,1),50)");
    expect(sql).toContain("interval '1 minute'");
  });
  test("removed content, reports and blocks are enforced", () => {
    expect(sql).toContain("mensagem removida.");
    expect(sql).toContain("'message',p_message");
    expect(sql).toContain("block_community_message_sender");
  });
  test("social actions never award Momentum", () => {
    expect(sql).toContain("on conflict(message_id,user_id) do update");
    expect(sql).not.toContain("insert into public.momentum_events");
  });
  test("privacy excludes workspace and email", () => {
    expect(sql).not.toContain("select email");
    expect(sql).not.toContain("projects");
    expect(sql).not.toContain("assistant messages");
  });
  test("realtime scopes, reconciles and cleans up", () => {
    expect(service).toContain("filter: `channel_id=eq.${channelId}`");
    expect(service).toContain("removeChannel(channel)");
    expect(service).toContain("setTimeout(onChange, 120)");
  });
  test("notifications default conservatively", () => {
    expect(sql).toContain("default 'highlights'");
  });
});
