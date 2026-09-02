import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const tabs = source("../app/(app)/(tabs)/_layout.tsx");
const more = source("../app/(app)/(tabs)/more.tsx");
const settings = source("../app/(app)/settings.tsx");
const agent = source("../components/nexora-agent.tsx");
const productUi = source("../components/product-ui.tsx");
const authProvider = source("../providers/auth-provider.tsx");
const logout = source("../hooks/use-logout.ts");

describe("Revision 13 — acabamento global nativo", () => {
  test("as cinco abas primárias continuam canônicas e o chat permanece oculto", () => {
    for (const title of ["Início", "Assistente", "Projetos", "Tarefas", "Mais"])
      expect(tabs).toContain(`title: "${title}"`);
    expect(tabs.match(/options=\{\{ title:/g)).toHaveLength(5);
    expect(tabs).toContain('<Tabs.Screen name="assistant-chat" options={{ href: null }} />');
    expect(tabs).toContain("tabBarHideOnKeyboard: true");
  });
  test("nomes técnicos de rotas não são apresentados como títulos", () => {
    expect(tabs).not.toMatch(/title:\s*["'](?:dashboard|productivity|assistant-chat|projects\/index)["']/i);
    expect(more).not.toMatch(/assistant-chat|projects\/index|\(tabs\)/);
  });
  test("Mais organiza somente os seis módulos reais", () => {
    expect(more).toContain('title="EXECUÇÃO"');
    expect(more).toContain('title="CONTA & NEXORA"');
    expect([...more.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual([
      "/arena", "/journeys", "/studies", "/community", "/premium", "/settings",
    ]);
  });
  test("superfícies sociais e de progresso não fabricam atividade competitiva", () => {
    const social = [source("../app/(app)/arena.tsx"), source("../app/(app)/community/index.tsx"), source("../app/(app)/community/[channelId].tsx"), source("../app/(app)/community/squads/[squadId].tsx")].join("\n");
    expect(social).not.toMatch(/fake user|usuário fake|dados? demo|ranking global|pessoas online/i);
    expect(source("../app/(app)/(tabs)/dashboard.tsx")).not.toMatch(/score de produtividade|pontuação de produtividade/i);
    expect(source("../app/(app)/arena.tsx")).not.toMatch(/leaderboard|participantes fictícios/i);
  });
  test("billing de teste permanece indisponível e sem CTA incompatível", () => {
    const pkg = JSON.parse(source("../package.json"));
    const premium = source("../app/(app)/premium.tsx");
    expect(pkg.dependencies["react-native-iap"]).toBeUndefined();
    expect(premium).toContain("Assinaturas Premium estarão disponíveis em breve.");
    expect(premium).not.toMatch(/Comprar agora|Assinar agora/);
  });
  test("erros técnicos não chegam às superfícies principais", () => {
    expect([more, settings, source("../app/(app)/(tabs)/dashboard.tsx")].join("\n")).not.toMatch(/PostgREST|stack trace|HTTP payload|RPC\s|SQL\s|Supabase/i);
  });
  test("Agent anuncia estados em PT-BR, respeita movimento reduzido e limpa animações", () => {
    expect(agent).toContain('idle: "NEXORA disponível"');
    expect(agent).toContain('thinking: "NEXORA pensando"');
    expect(agent).toContain('listening: "NEXORA ouvindo"');
    expect(agent).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(agent).toContain("clearTimeout(timer.current)");
    expect(agent).toContain("breathing.stop()");
  });
  test("interações principais preservam alvo mínimo de 44dp e semântica", () => {
    expect(productUi).toMatch(/icon:\s*\{ width: 44, height: 44/);
    expect(productUi).toMatch(/avatarButton:\s*\{ width: 44, height: 44/);
    expect(productUi).toContain("accessibilityHint={description}");
    expect(settings).toMatch(/minHeight: 48/);
    expect(tabs).toContain("layout.tabBarBaseHeight");
  });
  test("falhas auxiliares permanecem isoladas e recuperáveis", () => {
    const home = source("../app/(app)/(tabs)/dashboard.tsx");
    expect(home).toContain("Promise.allSettled");
    expect(home).toContain("projectsQuery.isError");
    expect(settings).toContain("refreshNotifications");
    expect(settings).toContain('label="Tentar novamente"');
  });
  test("limpeza global do cache fica restrita a mudanças de identidade", () => {
    const production = execFileSync("rg", ["-l", "(?:queryClient|client)\\.clear\\(\\)", "app", "components", "features", "hooks", "lib", "providers", "services"], { cwd: fileURLToPath(new URL("..", import.meta.url)), encoding: "utf8" }).trim().split("\n").filter(Boolean).sort();
    expect(production).toEqual(["hooks/use-logout.ts", "providers/auth-provider.tsx"]);
    expect(authProvider).toContain("activeUserId.current !== nextUserId");
    expect(logout).toContain("queryClient.clear()");
  });
  test("notificações distinguem teste local de solicitação remota", () => {
    expect(settings).toContain("TESTE LOCAL NESTE APARELHO");
    expect(settings).toContain("PUSH REMOTO");
    expect(settings).toContain("sem verificar a entrega por servidor");
    expect(settings).toContain("A entrega precisa ser confirmada no aparelho");
    expect(settings).not.toContain("Notificação enviada para este dispositivo.");
  });
  test("a revisão permanece limitada ao código nativo permitido", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const changed = execFileSync("git", ["diff", "--name-only", "ddd1dd2fe8b13e7a219238c5cff900976ccc85aa...HEAD"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const file of changed) {
      expect(file).toStartWith("mobile/");
      expect(file).not.toStartWith("mobile/android/");
      expect(file).not.toBe("mobile/app.json");
      expect(file).not.toContain("migration");
    }
  });
});
