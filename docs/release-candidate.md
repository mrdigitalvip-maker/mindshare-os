# Fase 11 — Release Candidate

Data da auditoria: 6 de agosto de 2026. Escopo: conteúdo do checkout atual, sem depender da
existência de `main` ou de remote Git.

## Estado do produto e confirmação das Fases 1–10

O checkout contém as dez fases anteriores: a fundação e o inventário frontend estão em
`PRODUCTION_AUDIT.md`; a adaptação de services e auditorias Supabase das Fases 2–4 aparecem no
mesmo relatório e em `phase-4-supabase-audit.md`; a arquitetura e capacidades de IA estão nos
relatórios das Fases 5–6 e na função `ai-chat`; monetização e ciclo Stripe estão na Fase 7 e nas
quatro Edge Functions; deploy, segurança e aceite estão na Fase 8; conexão dos módulos, dashboard,
busca, notificações e histórico estão na Fase 9; acabamento responsivo, acessibilidade e produção
estão na Fase 10. A confirmação foi feita por rotas, services, hooks, funções e documentação — não
apenas pelo histórico Git.

O candidato compila e passa por lint e TypeScript. A validação integral com provedores reais é um
gate operacional: exige um projeto Supabase configurado, credenciais de teste, entrega de e-mail,
OpenAI, Stripe e webhook acessíveis. Nenhuma dessas dependências foi simulada como sucesso de
produção.

## Checklist funcional

Legenda: **✓** verificado no código/build ou em demo; **⚠** conectado, mas aceite ponta a ponta
depende de serviço/credencial externa; **✗** quebrado.

| Área | Estado | Evidência funcional / observação |
| --- | --- | --- |
| Landing, navegação e sitemap | ✓ | CTAs, âncoras, autenticação, Premium e sitemap possuem destinos. |
| Cadastro e login por senha | ⚠ | Supabase Auth conectado; requer instância e política de e-mail reais. |
| Google OAuth | ⚠ | Provider e redirect conectados; requer provider habilitado. |
| Confirmação e recuperação de e-mail | ⚠ | Rotas e callbacks conectados; entrega depende do SMTP/Supabase. |
| Troca de senha, logout e nova sessão | ⚠ | APIs Supabase conectadas; aceite requer sessão real. |
| Onboarding, avatar, perfil e preferências | ⚠ | Persistência conectada; upload requer bucket/policies existentes. |
| Shell, sidebar, header e perfil | ✓ | Navegação desktop/mobile e ações de perfil/logout conectadas. |
| Dashboard | ✓ | Estatísticas, atividade e projetos vêm de queries reais; possui loading, vazio e erro. |
| Assistant | ⚠ | Persistência, Markdown, histórico, renomear, remover, copiar, regenerar, timeout e erros conectados; resposta exige OpenAI/Edge. |
| Projects | ✓ | Listagem e criação usam `ProjectService`. |
| Productivity/Notas | ✓ | Listagem, criação e conclusão usam service persistente. |
| Documents e upload | ⚠ | Documentos usam service; upload/IA exigem storage, policies e provider configurados. |
| Content | ⚠ | Rascunhos persistem; geração exige Edge/OpenAI. |
| Studies | ⚠ | Planos persistem; assistência exige Edge/OpenAI. |
| Finance | ⚠ | Metas/dados usam tabelas reais; insights dependem de Premium e OpenAI. |
| Agents | ⚠ | CRUD usa service; execução depende de Premium e OpenAI. |
| Translate | ⚠ | Chamada real de IA com debounce, loading, erro e cópia validada; exige provider. |
| Busca global | ✓ | Busca agregada, navegação e estados vazio/erro conectados. |
| Notificações | ✓ | Listar, marcar uma/todas e excluir usam service persistente. |
| Free, Premium e limites | ⚠ | Entitlement é consultado no backend; limites são aplicados pela Edge Function. |
| Checkout, trial e portal | ⚠ | Sessões e redirects conectados; exigem produtos/preços/webhook Stripe reais. |
| Cancelamento e falha de pagamento | ⚠ | Portal e estados persistidos suportados; aceite requer eventos Stripe. |

Nenhum item foi classificado como **✗** após as correções desta fase.

## Bugs encontrados e corrigidos

- Tradução disparava uma requisição de IA a cada tecla, causando consultas duplicadas, consumo de
  quota e transições instáveis. Foi aplicado debounce com cancelamento e estado de processamento.
- A ação de copiar tradução anunciava sucesso mesmo quando a Clipboard API falhava. A confirmação
  agora ocorre somente após a Promise resolver, com erro explícito em caso de falha.
- Não existia README raiz nem comando único de QA. Foram adicionados setup, arquitetura segura,
  deploy e scripts `typecheck`/`check`.
- O manifesto não refletia explicitamente o produto consolidado. Missão, visão, produto, modelos,
  IA, privacidade e roadmap foram alinhados ao estado real sem alterar sua essência.

## Bloqueios e limitações

- Não é possível certificar cadastro, SMTP, OAuth, storage, OpenAI, Stripe Checkout/Portal/webhook
  ou persistência entre dispositivos sem ambiente externo e credenciais de teste. Use o checklist
  manual da Fase 8 antes do go-live.
- O trial automático fora do Stripe permanece reservado porque não há contrato de schema aprovado;
  o trial efetivo é o criado e confirmado pelo Stripe. Nenhuma migration foi alterada.
- O bundle inicial gera aviso acima de 500 kB. As rotas já são separadas, mas uma alteração maior
  de vendor chunking deve ser medida em ambiente alvo e não foi introduzida nesta fase de congelamento.
- Exclusão/retensão de conta e obrigações legais regionais precisam de decisão operacional antes
  do lançamento público; não se alterou schema, policies ou arquitetura para inferir esse contrato.

## Auditoria final

### Funcional, segurança e performance

- Todas as rotas e ocorrências de botões, links, formulários e handlers foram inventariadas por
  busca estática; não foram encontrados `TODO`/`FIXME` de produção nem handlers deliberadamente vazios.
- UI acessa integrações por services; chaves OpenAI, Stripe e service-role não são variáveis `VITE_`.
- Demo é opt-in e falhas reais não caem automaticamente em mocks.
- Queries de dashboard são agregadas e cacheadas pelo React Query. A tradução agora evita rajadas
  de chamadas e cancela atualizações obsoletas.

### Responsividade e acessibilidade

- Rotas usam breakpoints mobile-first, grids progressivos e shell móvel. Overlays de busca,
  notificações e histórico limitam largura/altura ao viewport.
- Controles icon-only auditados possuem rótulos nas superfícies do produto; loading e erros críticos
  são comunicados. O novo loading de tradução usa região `aria-live`.
- A auditoria visual automatizada por screenshots não pôde ser executada neste checkout porque não
  há navegador instalado. Deve ser repetida no preview em 320 px, 768 px e 1440 px antes do go-live.

## Dependências externas

- Supabase Auth, Postgres, Storage, RLS e Edge Functions.
- OpenAI para Assistant e ações de IA.
- Stripe Checkout, Customer Portal e webhooks para assinatura.
- Hosting compatível com a saída Nitro/TanStack Start, conforme runbook (por exemplo, Vercel com a
  configuração validada para o projeto).

## Funcionalidades futuras

Não fazem parte deste candidato: trial próprio sem Stripe, automações agendadas de agentes,
portabilidade/exclusão completa definida por política e otimização adicional do vendor bundle.
Esses itens exigem contrato de produto/schema ou medição operacional e não devem bloquear os
fluxos existentes quando a infraestrutura obrigatória estiver configurada.

## Checklist de lançamento

- [ ] Criar ambiente de staging a partir de `.env.example`, sem segredos no frontend.
- [ ] Aplicar o schema/migrations existentes e validar RLS com dois usuários distintos.
- [ ] Configurar URLs de Auth, SMTP e Google OAuth; executar cadastro, confirmação, reset e login.
- [ ] Criar buckets/policies existentes e validar upload, leitura e isolamento.
- [ ] Definir secrets das Edge Functions e restringir `APP_URL` à origem final.
- [ ] Executar Assistant e cada ação IA nos planos Free e Premium, incluindo limites e timeout.
- [ ] Configurar produto/preço Stripe, Checkout, Portal e endpoint/webhook assinado.
- [ ] Testar trialing, active, cancelled, past_due, renovação e idempotência do webhook.
- [ ] Executar o fluxo de novo usuário completo e confirmar persistência após logout/login.
- [ ] Executar screenshots e interação em 320 px, 768 px e 1440 px, teclado e leitor de tela.
- [ ] Executar `npm run check` e `git diff --check` no artefato que será publicado.
- [ ] Validar headers, logs, alertas, analytics, rollback e backup conforme o runbook da Fase 8.
- [ ] Registrar aceite humano de produto, segurança, privacidade e faturamento; decidir go/no-go.
