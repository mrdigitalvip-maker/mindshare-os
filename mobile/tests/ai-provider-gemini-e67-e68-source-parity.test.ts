import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const registry=source("../../supabase/functions/_shared/kivryn-ai-provider-registry.ts");
const router=source("../../supabase/functions/_shared/kivryn-ai-provider-router.ts");
const gemini=source("../../supabase/functions/_shared/kivryn-gemini.ts");
const statusEdge=source("../../supabase/functions/ai-provider-status/index.ts");

function walk(dir:string):string[]{
  const out:string[]=[];
  for(const name of readdirSync(dir)){
    const full=join(dir,name);
    const stat=statSync(full);
    if(stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe("E67/E68 AI provider base source parity",()=>{
  test("OpenAI remains primary while Gemini is capability-scoped",()=>{
    expect(router).toContain('text: "openai"');
    expect(router).toContain('reasoning: "openai"');
    expect(registry).toContain('id: "gemini"');
    expect(registry).toContain('enabledCapabilities: ["text", "reasoning"]');
  });

  test("Gemini paid mode requires explicit server authorization",()=>{
    expect(registry).toContain("GEMINI_MODE");
    expect(registry).toContain("GEMINI_PAID_AUTHORIZED");
    expect(registry).toContain('requested === "paid" && paidAuthorized ? "paid" : "free"');
  });

  test("Live remains disabled in this base Edition",()=>{
    expect(registry).toContain('"live_voice"');
    expect(statusEdge).toContain("geminiLiveEnabled: false");
  });

  test("Gemini provider calls stay server-side with quota and timeout protection",()=>{
    expect(gemini).toContain("GEMINI_FREE_DAILY_REQUEST_LIMIT");
    expect(gemini).toContain("AbortController");
    expect(gemini).toContain('"x-goog-api-key": credential');
  });

  test("Android source contains no Gemini long-lived credential reference",()=>{
    const mobileRoot=fileURLToPath(new URL("..",import.meta.url));
    for(const file of walk(mobileRoot)){
      if(!/\.(ts|tsx|js|jsx|json)$/.test(file)) continue;
      expect(readFileSync(file,"utf8")).not.toMatch(/GEMINI_(?:API|AUTH)_KEY/);
    }
  });
});
