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
