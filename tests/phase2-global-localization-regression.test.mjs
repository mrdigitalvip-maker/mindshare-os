import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const content = read("src/routes/_shell.content.tsx");
const contentDetail = read("src/routes/_shell.content.$contentId.tsx");
const finance = read("src/routes/_shell.finance.tsx");
const financeDetail = read("src/routes/_shell.finance.accounts.$accountId.tsx");
const studio = read("src/routes/_shell.studio.tsx");
const studies = read("src/routes/_shell.studies.tsx");
const agents = read("src/routes/_shell.agents.tsx");
const journeys = read("src/routes/_shell.journeys.tsx");
const packs = read("src/routes/_shell.packs.tsx");
const premium = read("src/routes/_shell.premium.tsx");
const authCallback = read("src/routes/auth.callback.tsx");

test("Content list, creation flow and editor use resolved locale", () => {
  assert.match(content, /useLanguage/);
  assert.match(content, /L\("Espaço editorial", "Editorial workspace"\)/);
  assert.match(content, /L\("Criar conteúdo", "Create content"\)/);
  assert.match(contentDetail, /L\("Rascunho salvo", "Draft saved"\)/);
  assert.match(contentDetail, /L\("Alterações não salvas", "Unsaved changes"\)/);
  assert.doesNotMatch(content, /eyebrow="Editorial workspace"/);
  assert.doesNotMatch(contentDetail, />Save</);
});

test("Finance overview, editor and account detail are bilingual", () => {
  assert.match(finance, /L\("Saldo", "Balance"\)/);
  assert.match(finance, /L\("Histórico de transações", "Transaction history"\)/);
  assert.match(finance, /L\("Conta salva", "Account saved"\)/);
  assert.match(financeDetail, /L\("Conta não encontrada", "Account not found"\)/);
  assert.match(financeDetail, /L\("Atividade recente", "Recent activity"\)/);
  assert.doesNotMatch(finance, />Accounts</);
  assert.doesNotMatch(financeDetail, />Recent activity</);
});

test("Studio overview resolves pt-BR/en copy without changing persisted learning data", () => {
  assert.match(studio, /useLanguage/);
  assert.match(studio, /L\("Sistema de aprendizagem KIVRYN", "KIVRYN learning system"\)/);
  assert.match(studio, /L\("Sua trajetória ativa", "Your active trajectory"\)/);
  assert.match(studio, /L\("Ambientes de aprendizagem", "Learning environments"\)/);
  assert.match(studio, /L\("Últimos 7 dias", "Last 7 days"\)/);
  assert.match(studio, /StudioService\.overview\(\)/);
});

test("Studies overview no longer mixes English controls into pt-BR", () => {
  assert.match(studies, /resolvedLocale === "pt-BR" \? "Espaço de aprendizagem" : "Learning workspace"/);
  assert.match(studies, /resolvedLocale === "pt-BR" \? "Nova matéria" : "New subject"/);
  assert.match(studies, /resolvedLocale === "pt-BR" \? "Criar e abrir" : "Create and open"/);
  assert.doesNotMatch(studies, />New subject</);
  assert.doesNotMatch(studies, /\? "Creating…" : "Create and open"/);
});


test("Agents list and builder resolve pt-BR/en copy", () => {
  assert.match(agents, /L\("Agentes ativos", "Active agents"\)/);
  assert.match(agents, /L\("Buscar por nome ou objetivo", "Search by name or purpose"\)/);
  assert.match(agents, /L\("O que este agente deve fazer\?", "What should this agent do\?"\)/);
  assert.match(agents, /L\("Criar agente", "Create agent"\)/);
  assert.doesNotMatch(agents, /label="Active agents"/);
  assert.doesNotMatch(agents, /placeholder="Search by name or purpose"/);
});

test("Journeys and Packs expose bilingual navigation and creation copy", () => {
  assert.match(journeys, /L\("Espaço de execução", "Execution workspace"\)/);
  assert.match(journeys, /L\("Criar Jornada", "Create Journey"\)/);
  assert.match(journeys, /L\("Todas as Jornadas", "All Journeys"\)/);
  assert.match(packs, /L\("Packs de Jornadas", "Journey Packs"\)/);
  assert.match(packs, /L\("Ver Pack", "View Pack"\)/);
});

test("Premium billing states and legal copy resolve pt-BR/en", () => {
  assert.match(premium, /L\("Status atual", "Current status"\)/);
  assert.match(premium, /L\("Verificando…", "Checking…"\)/);
  assert.match(premium, /L\("Gerenciar cobrança, pagamento ou cancelamento", "Manage billing, payment or cancellation"\)/);
  assert.match(premium, /L\("Termos de Serviço", "Terms of Service"\)/);
  assert.match(premium, /L\("Política de Privacidade", "Privacy Policy"\)/);
});

test("OAuth callback is both routable and bilingual", () => {
  assert.match(authCallback, /useLanguage/);
  assert.match(authCallback, /L\("Concluindo login", "Completing sign in"\)/);
  assert.match(authCallback, /L\("Voltar para o login", "Return to sign in"\)/);
});
