import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  assistantRequestFingerprint,
  parseAssistantQuotaClaim,
} from "../../supabase/functions/_shared/assistant-quota";

type Plan = "free" | "premium";
type State = { assistant: number; attachment: number; requests: Map<string, string> };
const state = (assistant = 0, attachment = 0): State => ({
  assistant,
  attachment,
  requests: new Map(),
});
function claim(s: State, plan: Plan, id: string, fingerprint: string, attachment: boolean) {
  if (s.requests.has(id)) return s.requests.get(id) === fingerprint ? "replay" : "conflict";
  if (s.assistant >= (plan === "premium" ? 100 : 10)) return "assistant_limit";
  if (attachment && s.attachment >= (plan === "premium" ? 20 : 2)) return "attachment_limit";
  s.requests.set(id, fingerprint);
  s.assistant += 1;
  if (attachment) s.attachment += 1;
  return "allowed";
}

describe("Assistant server-authoritative quota contract", () => {
  test("Free below and exactly at limit", () => {
    expect(claim(state(9), "free", "a", "one", false)).toBe("allowed");
    expect(claim(state(10), "free", "b", "two", false)).toBe("assistant_limit");
  });
  test("Premium uses limit 100", () => {
    expect(claim(state(99), "premium", "a", "one", false)).toBe("allowed");
    expect(claim(state(100), "premium", "b", "two", false)).toBe("assistant_limit");
  });
  test("text-only consumes only Assistant; attachment consumes both", () => {
    const s = state();
    claim(s, "free", "a", "one", false);
    expect(s).toMatchObject({ assistant: 1, attachment: 0 });
    claim(s, "free", "b", "two", true);
    expect(s).toMatchObject({ assistant: 2, attachment: 1 });
  });
  test("attachment exhaustion blocks without spending Assistant", () => {
    const s = state(4, 2);
    expect(claim(s, "free", "a", "one", true)).toBe("attachment_limit");
    expect(s).toMatchObject({ assistant: 4, attachment: 2 });
  });
  test("Assistant exhaustion wins while attachment remains", () => {
    expect(claim(state(10, 0), "free", "a", "one", true)).toBe("assistant_limit");
  });
  test("retry does not duplicate and mismatched reuse conflicts", () => {
    const s = state();
    expect(claim(s, "free", "a", "one", true)).toBe("allowed");
    expect(claim(s, "free", "a", "one", true)).toBe("replay");
    expect(s).toMatchObject({ assistant: 1, attachment: 1 });
    expect(claim(s, "free", "a", "different", true)).toBe("conflict");
  });
  test("fingerprint binds content and conversation", async () => {
    const base = { message: "oi", conversationId: null, attachments: [] };
    expect(await assistantRequestFingerprint(base)).not.toBe(
      await assistantRequestFingerprint({ ...base, message: "outro" }),
    );
    expect(await assistantRequestFingerprint(base)).not.toBe(
      await assistantRequestFingerprint({ ...base, conversationId: "other" }),
    );
  });
  test("response parser fails closed", () => {
    expect(parseAssistantQuotaClaim({ allowed: true })).toBeNull();
    expect(
      parseAssistantQuotaClaim({
        allowed: true,
        replay: false,
        entitlement: "free",
        assistant: { used: 1, limit: 10 },
      }),
    ).toMatchObject({ allowed: true });
  });
  test("SQL owns entitlement, fixed limits, locking and downgrade preservation", () => {
    const sql = readFileSync(
      "../supabase/migrations/202608270001_assistant_atomic_quotas.sql",
      "utf8",
    );
    expect(sql).toContain("premium := public.has_premium(uid)");
    expect(sql).toContain("then 100 else 10");
    expect(sql).toContain("then 20 else 2");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).not.toMatch(/delete\s+from\s+(public\.)?(ai_usage|assistant_usage_claims)/i);
  });
  test("near-limit claims serialize before counts", () => {
    const sql = readFileSync(
      "../supabase/migrations/202608270001_assistant_atomic_quotas.sql",
      "utf8",
    );
    expect(sql.indexOf("pg_advisory_xact_lock")).toBeLessThan(
      sql.indexOf("select count(*) into assistant_used"),
    );
    const s = state(9);
    expect([claim(s, "free", "a", "one", false), claim(s, "free", "b", "two", false)]).toEqual([
      "allowed",
      "assistant_limit",
    ]);
  });
  test("auth, idempotency, quota, persistence and provider order is deliberate", () => {
    const source = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
    const auth = source.indexOf("await supabase.auth.getUser()");
    const prior = source.indexOf('.eq("id", body.requestId)');
    const quota = source.indexOf('"claim_assistant_usage"');
    const persistence = source.indexOf('.from("ai_messages").insert', quota);
    const provider = source.indexOf("await callOpenAI(", quota);
    expect(auth).toBeLessThan(prior);
    expect(prior).toBeLessThan(quota);
    expect(quota).toBeLessThan(persistence);
    expect(persistence).toBeLessThan(provider);
  });
  test("client plan cannot elevate RPC claim", () => {
    const source = readFileSync("../supabase/functions/ai-chat/index.ts", "utf8");
    const rpc = source.slice(
      source.indexOf('"claim_assistant_usage"'),
      source.indexOf("if (quotaClaimError)"),
    );
    expect(rpc).not.toMatch(/body\.(plan|entitlement)|p_(plan|entitlement)/);
  });
});
