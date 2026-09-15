import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Edition 9 action authority separation", () => {
  it("keeps new orchestration modules free of direct Supabase/database writes", () => {
    for (const file of ["kivryn-action-registry.ts", "kivryn-agentic-plan.ts", "kivryn-action-approval.ts", "kivryn-action-execution.ts", "kivryn-agent-capabilities.ts", "kivryn-action-audit.ts", "kivryn-agentic-core.ts"]) {
      const source = readFileSync(new URL(`../supabase/functions/_shared/${file}`, import.meta.url), "utf8");
      expect(source).not.toContain("createClient(");
      expect(source).not.toContain(".from(");
      expect(source).not.toContain(".rpc(");
    }
  });
});
