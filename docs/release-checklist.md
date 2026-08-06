# NEXORA — auditoria final de go-live

**Data:** 6 de agosto de 2026  
**Escopo:** revisão estática integral do checkout, build de produção e smoke test HTTP local.  
**Legenda:** ✓ aprovado; ⚠ parcial/bloqueado por validação operacional; ✗ quebrado.

## Veredito executivo

O código é um **release candidate**, mas o go-live ainda é **NO-GO operacional**. O build, lint e
typecheck passam; as rotas e integrações estão conectadas. Porém, este checkout não contém
credenciais, migrations/policies reproduzíveis nem acesso aos ambientes Supabase, OpenAI, Stripe,
SMTP e deploy. Assim, cadastro real, isolamento RLS, IA, cobrança, webhook e persistência remota não
podem ser certificados nesta auditoria. Esses são gates de produção, não bugs a mascarar com mocks.

Foram corrigidas duas lacunas locais de publicação: o app agora registra um service worker de
produção com fallback offline e `robots.txt` anuncia o sitemap. Nenhuma funcionalidade de produto
foi criada ou redesenhada.

## 1. Auditoria de rotas e superfícies

| Área                      | Estado | Resultado                                                                             |
| ------------------------- | :----: | ------------------------------------------------------------------------------------- |
| Landing                   |   ✓    | Renderização, CTAs, metadata e navegação presentes.                                   |
| Dashboard                 |   ✓    | Queries via hooks/services, skeleton, vazio, erro, atividade e quick actions.         |
| Assistant                 |   ⚠    | UI/histórico/Markdown/cópia/regeneração conectados; resposta real requer Edge/OpenAI. |
| Projects                  |   ✓    | Listagem e criação persistentes via service.                                          |
| Productivity / notas      |   ✓    | Criação e conclusão conectadas ao service.                                            |
| Documents                 |   ⚠    | CRUD conectado; upload exige bucket e policies reais.                                 |
| Content                   |   ⚠    | Rascunho conectado; geração depende de IA.                                            |
| Studies                   |   ⚠    | Matéria/estudo conectados; assistência depende de IA.                                 |
| Finance                   |   ⚠    | Registro conectado; insights dependem de entitlement e IA.                            |
| Agents                    |   ⚠    | CRUD conectado; execução depende de Premium e IA.                                     |
| Translate                 |   ⚠    | Debounce, loading, erro e cópia presentes; tradução depende de IA.                    |
| Settings / perfil         |   ⚠    | Preferências e perfil conectados; avatar requer Storage.                              |
| Premium                   |   ⚠    | Checkout/portal/status conectados; Stripe real não foi exercitado.                    |
| Authentication            |   ⚠    | Cadastro, login, Google e logout conectados; Auth/SMTP externos não exercitados.      |
| Onboarding                |   ⚠    | Fluxo e persistência conectados; requer usuário real.                                 |
| Confirm Email             |   ⚠    | Callback/estado presentes; entrega de e-mail não exercitada.                          |
| Reset Password            |   ⚠    | Solicitação e troca presentes; e-mail/callback não exercitados.                       |
| Search                    |   ✓    | Busca agregada, atalhos, loading, vazio e erro presentes.                             |
| Notifications             |   ✓    | Lista, marcar uma/todas e excluir conectados.                                         |
| Sidebar / header / perfil |   ✓    | Desktop/mobile, busca, notificações e menu de usuário conectados.                     |
| Rota desconhecida         |   ✓    | Estado 404 e retorno seguro presentes.                                                |

Nenhuma rota foi classificada como quebrada na inspeção e no build. “✓” significa verificável sem
provedor externo; não substitui o smoke test visual no deployment final.

## 2. Fluxo funcional de usuário novo

| Passo                                | Estado | Gate de aceite                                                     |
| ------------------------------------ | :----: | ------------------------------------------------------------------ |
| Criar conta, confirmar e fazer login |   ⚠    | Executar com SMTP e URLs de redirect de staging.                   |
| Concluir onboarding                  |   ⚠    | Confirmar linha de profile e persistência após nova sessão.        |
| Criar projeto, documento e nota      |   ⚠    | Executar com banco/RLS reais; documento com Storage.               |
| Conversar com IA e traduzir          |   ⚠    | Executar planos Free/Premium, limites, timeout e erro do provider. |
| Criar/executar agente                |   ⚠    | Execução requer Premium e Edge Function.                           |
| Criar matéria e registrar estudo     |   ⚠    | Confirmar isolamento entre dois usuários.                          |
| Registrar movimentação financeira    |   ⚠    | Confirmar persistência e agregados do dashboard.                   |
| Pesquisar e receber notificações     |   ⚠    | Confirmar resultados/updates com dados reais.                      |
| Assinar/cancelar/abrir Portal        |   ⚠    | Exercitar Stripe test mode e eventos webhook assinados.            |
| Logout, novo login e persistência    |   ⚠    | Obrigatório no staging; indisponível sem credenciais.              |

## 3. Dashboard

- ✓ Cards, indicadores, atividade recente, projetos e quick actions consomem hooks/services.
- ✓ Estados de loading, vazio e erro são explícitos; não foi localizado loading infinito.
- ✓ Não há estatística de produção criada diretamente na rota; dados demo só existem com
  `VITE_DEMO_MODE=true`.
- ⚠ Gráficos e números devem ser reconciliados com registros reais no staging antes do aceite.
- ⚠ Performance com volume de produção não foi medida.

## 4. Assistant

- ✓ Histórico persistente, seleção, renomear/remover conversa, Markdown, código, listas, tabelas,
  copiar, regenerar e scroll estão implementados.
- ✓ Loading, timeout, cancelamento e erro visível existem; falha real não vira sucesso mock.
- ✓ O frontend chama a Edge Function e não contém chave OpenAI.
- ⚠ Free/Premium, quota diária, contexto, modelos e persistência precisam ser exercitados contra
  Supabase/OpenAI reais.
- ⚠ Acessibilidade e scroll com respostas extensas exigem teste em browser físico.

## 5. Stripe

- ✓ Edge Functions separadas para Checkout, Portal e webhook; URLs de retorno usam `APP_URL`.
- ✓ Entitlement é resolvido no backend e o webhook usa service role apenas na função.
- ✓ Código contempla sincronização de assinatura e estados de cobrança; o frontend consulta status.
- ⚠ Checkout, trial do Stripe, upgrade, downgrade, cancelamento, Portal, retorno, idempotência,
  assinatura do webhook, concessão e remoção de Premium não foram executados sem conta/configuração.
- ⚠ Conferir no staging as linhas de `subscriptions` para `trialing`, `active`, `past_due`,
  `canceled` e eventos fora de ordem.

## 6. Supabase

- ✓ UI de workspace usa services e React Query; não foi encontrado import direto do cliente em
  componentes/rotas/hooks de dados. Auth permanece centralizado no provider.
- ✓ Auth, database, Storage e Edge Functions possuem pontos de integração; erros são propagados.
- ⚠ Realtime não é necessário para os fluxos atuais e não foi exercitado.
- ⚠ **Bloqueio:** não há migrations, seeds, configuração de buckets ou policies RLS versionadas
  neste checkout. A instância Supabase existente é requisito externo e deve ser auditada/exportada.
- ⚠ Validar RLS com dois usuários e confirmar que `user_id` não pode ser forjado.

## 7. Segurança

- ✓ Nenhum valor real de secret, chave Stripe, OpenAI ou service-role foi encontrado no frontend.
- ✓ `.env.example` separa variáveis públicas `VITE_` de secrets das Edge Functions.
- ✓ Demo/mock é opt-in por `VITE_DEMO_MODE=true`; credencial ausente ou falha live não o ativa.
- ✓ Rotas do shell têm guard de sessão e onboarding; Premium é validado pelo backend para IA.
- ✓ CORS das Edge Functions é centralizado e depende da origem configurada.
- ⚠ Guard do shell é client-side; a proteção efetiva dos dados depende integralmente de RLS, que
  precisa ser validada no projeto Supabase real.
- ⚠ Executar secret scan no repositório remoto/histórico e teste de autorização dinâmico antes do
  deploy; esta auditoria cobriu o working tree atual.

## 8. UX e responsividade

- ✓ Existem skeletons/loaders, empty states, error states, toasts, dialogs e feedback de sucesso.
- ✓ Layout mobile-first, sidebar móvel, grids responsivos, limites de viewport e safe-area iOS.
- ✓ Overlays e áreas roláveis têm contenção; controles críticos têm labels/ARIA na inspeção.
- ⚠ Não há navegador instalado neste ambiente; validação visual e interativa em 320 px, 768 px e
  1440 px, teclado, touch, leitor de tela e reduced-motion permanece obrigatória.
- ⚠ Estados com conteúdo extremo, zoom 200%, idiomas longos e teclado virtual devem integrar o
  smoke test de staging.

## 9. PWA e empacotamento

| Item                                            | Estado | Observação                                                                                   |
| ----------------------------------------------- | :----: | -------------------------------------------------------------------------------------------- |
| Manifest, name, start_url e scope               |   ✓    | Manifest válido e vinculado no head.                                                         |
| theme/background color, display e orientation   |   ✓    | Valores explícitos.                                                                          |
| Ícone 512, maskable, favicon e Apple touch icon |   ✓    | Asset declarado para `any` e `maskable`.                                                     |
| Service worker e offline básico                 |   ✓    | Registro somente em produção; shell e tela offline cacheados.                                |
| Install prompt                                  |   ✓    | Manifest + HTTPS + service worker habilitam o prompt nativo do navegador.                    |
| Splash screen                                   |   ⚠    | Gerada pela plataforma a partir do manifest; validar no dispositivo alvo.                    |
| Ícone dedicado 192 e maskable com safe-zone     |   ⚠    | O 512 declarado é aceito, mas assets dedicados devem ser validados no PWABuilder.            |
| PWA Builder / Desktop PWA                       |   ⚠    | Tecnicamente preparado; executar score/instalação no domínio HTTPS final.                    |
| Android App Bundle / Play Console               |   ⚠    | Gerar/assinar AAB no PWABuilder e concluir Digital Asset Links, ficha, privacidade e testes. |

O service worker não cacheia respostas autenticadas nem usa cache-first para navegação, evitando
servir workspace privado antigo; offline básico mostra uma página neutra.

## 10. SEO

- ✓ Title, description, Open Graph, Twitter Card, favicon e sitemap existem.
- ✓ `robots.txt` permite crawl e agora referencia o sitemap.
- ⚠ Canonical absoluto e URLs de sitemap/social devem ser confirmados para o domínio final. O
  sitemap assume `https://nexora.app` quando `VITE_PUBLIC_SITE_URL` não é definido.
- ⚠ Rotas autenticadas não devem ser indexadas; confirmar headers/meta no deployment.

## 11. Build e qualidade

| Comando                                        | Resultado                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                | ✓ sucesso; warning de chunk client inicial de 564,52 kB e warnings de tooling.                                                              |
| `npm run lint`                                 | ✓ sucesso, sem erros.                                                                                                                       |
| `npx tsc --noEmit`                             | ✓ sucesso, sem erros.                                                                                                                       |
| `git diff --check`                             | ✓ sucesso.                                                                                                                                  |
| `git status --short --branch`                  | ✓ branch `work`; somente alterações desta auditoria antes do commit.                                                                        |
| `npm run preview -- --host 127.0.0.1` + `curl` | ⚠ o preview do plugin procura `dist/server/server.js`, enquanto o build Nitro emite `.output`; repetir o smoke HTTP no adapter/deploy alvo. |

Não foi identificada suíte automatizada de testes no `package.json`. O warning de bundle já era
conhecido e não impede o build, mas é melhoria futura. O warning npm sobre `http-proxy` vem da
configuração do ambiente e o Vite também reporta recomendação de migração do plugin tsconfig paths.

## 12. Produção e variáveis

- ✓ `.env.example` lista Supabase público, demo opt-in, OpenAI, limites, Stripe e `APP_URL`.
- ✓ Secrets privados não usam prefixo `VITE_`.
- ⚠ Substituir todos os valores vazios/placeholders exclusivamente nos secret stores de staging e
  produção; nunca commitar valores reais.
- ⚠ Configurar Supabase Auth URLs/SMTP/OAuth, secrets e deploy das quatro Edge Functions.
- ⚠ Configurar Stripe Price, webhook e Customer Portal; conferir CORS/`APP_URL` exatos.
- ⚠ Validar preset/adapter no provedor escolhido (incluindo Vercel, se usado), headers HTTPS,
  domínio, logs, alertas, backup e rollback.

## Bugs encontrados

1. Não havia registro de service worker nem fallback offline, embora o manifest declarasse o app
   como instalável.
2. `robots.txt` não anunciava o sitemap existente.
3. O checkout não versiona migrations/RLS/buckets, impedindo reprodução e certificação isolada do
   backend (bloqueio operacional documentado, não corrigido sem contrato/schema fonte).
4. Bundle inicial acima de 500 kB (não crítico; não alterado durante freeze).

## Bugs corrigidos nesta auditoria

1. Adicionado service worker de produção, cache mínimo versionado, limpeza de cache antigo e tela
   offline neutra.
2. Adicionada referência absoluta ao sitemap em `robots.txt`.

## Bloqueios de go-live

1. Ambiente Supabase real, schema/RLS/Storage e credenciais não disponíveis para teste.
2. SMTP/OAuth e fluxo completo de novo usuário não exercitados.
3. OpenAI e limites Free/Premium não exercitados ponta a ponta.
4. Stripe Checkout/Portal/webhook/ciclo da assinatura não exercitados em test mode.
5. Deploy HTTPS final, domínio, CORS, screenshots responsivos e instalação PWA/AAB não validados.
6. Aceites de privacidade, retenção/exclusão de conta e requisitos da Play Console dependem do
   responsável pelo produto/operação.

## Melhorias futuras não críticas

- Medir e reduzir o chunk inicial sem mudar comportamento.
- Adicionar suíte E2E para Auth, CRUD, IA e Stripe em staging.
- Versionar/exportar migrations, RLS, buckets e configuração Supabase.
- Produzir ícones dedicados 192/512 e maskable com safe-zone, além de screenshots do manifest.
- Automatizar Lighthouse/PWABuilder, acessibilidade e matrizes de viewport no CI.
- Definir canonical por ambiente e política explícita de `noindex` para superfícies autenticadas.

## Checklist operacional para converter NO-GO em GO

- [ ] Provisionar staging a partir da configuração aprovada e exportar/versionar o backend.
- [ ] Rodar o fluxo funcional completo acima com dois usuários e registrar evidências.
- [ ] Validar todas as ações IA em Free/Premium, quota, timeout e falhas.
- [ ] Validar o ciclo Stripe completo e reconciliar `subscriptions` após cada webhook.
- [ ] Rodar Lighthouse/PWABuilder no HTTPS final e instalar em desktop e Android.
- [ ] Gerar AAB assinado, configurar Digital Asset Links e cumprir checks da Play Console.
- [ ] Testar 320/768/1440 px, touch, teclado, leitor de tela, offline e retomada de rede.
- [ ] Reexecutar build, lint, typecheck, diff check e smoke HTTP no commit publicado.
- [ ] Obter aceite humano de produto, segurança, privacidade e faturamento.

**Confirmação final:** o código local está apto a seguir para staging e validação no PWABuilder. Não
está certificado para AAB, Google Play Console ou lançamento público até que os bloqueios externos
acima sejam concluídos sem falhas.
