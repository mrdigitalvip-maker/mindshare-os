# Auditoria funcional final do produto

## Base confirmada e diagnóstico inicial

A auditoria foi feita sobre o checkout atual da branch `work`, sem depender de `main` ou remote. A base contém TanStack Start/Router, React Query, Supabase Auth e tipos gerados, services user-scoped, Edge Functions de IA e Stripe, PWA e service worker. Nenhum schema, migration, policy/RLS, preço, secret ou contrato público foi alterado.

O diagnóstico encontrou uma base de dados/serviços substancialmente mais completa que algumas telas: Assistant já tinha histórico e Markdown, enquanto Projects e Productivity ainda criavam registros genéricos sem formulário, edição ou exclusão na UI. Finance mostrava contas como “metas”; Documents dizia “Upload” sem upload físico; cards de Studies/Content eram parcialmente descritivos. As correções deste ciclo priorizam o critério crítico de entrada limpa no Assistant e CRUD real de projetos/tarefas, documentando com transparência o restante.

## Matriz funcional

| Módulo                | Esperado                                   | Estado inicial / problema                                                          | Solução aplicada ou estado validado                                                                                              | Limitação                                                                                |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Assistant             | entrada limpa, histórico opt-in, chat real | carregava história implicitamente; scroll sem retorno explícito                    | removido carregamento automático; histórico desktop/sheet, novo chat sem registro, botão de retorno ao fim, safe area e `100dvh` | backend não oferece streaming real                                                       |
| Projects              | criar, listar, editar, excluir, progresso  | criação genérica e cards sem ações                                                 | formulário validado, descrição/status, edição/exclusão e progresso derivado de tarefas                                           | schema não possui objetivo, prioridade nem datas do projeto                              |
| Productivity          | CRUD, busca e visões                       | apenas criar/toggle; cards de calendário/foco sugeriam capacidades não persistidas | formulário, edição, conclusão/reabertura, exclusão, busca, Hoje/Pendentes/Concluídas, loading/error/empty                        | foco não possui contrato; não é exibido como persistido                                  |
| Studies               | matérias, sessões e IA                     | services suportam subjects/sessions/assist; UI ainda superficial                   | persistência e cálculo real auditados                                                                                            | sem início/fim de cronômetro; duração é manual                                           |
| Finance               | contas/transações/resumo                   | services completos; UI representa conta como goal e não expõe transações           | contrato auditado; não foram adicionadas metas fictícias                                                                         | não existe tabela de metas; UI completa de transações segue necessária                   |
| Documents             | editor CRUD                                | service permite documento e metadados, mas update não expõe conteúdo               | relação `documents`/`files` não é presumida                                                                                      | upload/storage/processamento físico ausente                                              |
| Content               | drafts e transformações reais              | CRUD/IA no service, UI parcial                                                     | IA continua exclusivamente via Edge Function                                                                                     | editor/ações completas seguem necessárias                                                |
| Agents                | CRUD/run/history                           | service possui operações; UI parcial                                               | execução continua backend-only e Premium server-side                                                                             | UI detalhada de runs segue necessária                                                    |
| Translate             | traduzir/histórico                         | fluxo explícito e persistência de resultado real                                   | validado; sem chamadas a cada tecla                                                                                              | depende do provedor backend                                                              |
| Dashboard             | métricas reais/atalhos                     | agregação real já consolidada                                                      | validado sem criar cards sem fonte                                                                                               | cobertura é limitada às fontes agregadas existentes                                      |
| Search                | busca user-scoped                          | service e UI globais existentes                                                    | validado com debounce/query key                                                                                                  | cancelamento depende do lifecycle do React Query                                         |
| Notifications         | leitura real                               | service/center existentes                                                          | validado sem seed em produção                                                                                                    | exclusão depende do contrato atual                                                       |
| Push                  | push remoto                                | SW possui base PWA, infraestrutura servidor incompleta                             | nenhuma simulação adicionada                                                                                                     | faltam subscription table/policies, VAPID pública/privada, endpoint e sender server-side |
| Premium               | Stripe/status real                         | checkout/portal/webhook existentes                                                 | preservado; sem unlock por query string                                                                                          | testes reais exigem Stripe/Supabase configurados                                         |
| Settings/Profile      | preferências persistidas                   | service e formulário existentes                                                    | preservado                                                                                                                       | avatar/upload e exclusão automatizada dependem de backend                                |
| Auth/onboarding/shell | fluxos e responsividade                    | existentes                                                                         | preservados                                                                                                                      | validação real requer credenciais                                                        |

## Assistant

A rota agora sempre inicia no estado vazio e independente. Apenas selecionar uma conversa consulta suas mensagens; “Novo chat” apenas limpa estado local, sem criar linha vazia. Histórico permanece agrupado por data, pesquisável, renomeável e excluível, lateral em desktop e Sheet em mobile. O transcript tem scroll interno, deixa de acompanhar quando o usuário se afasta do fim e oferece “Ir para a mensagem mais recente”. O composer usa `100dvh` no container, safe area inferior, Enter/Ctrl+Enter, Shift+Enter, retenção do texto em erro, bloqueio duplicado e loading não-streaming honesto. Markdown, tabelas, listas, blockquotes e cópia de código/mensagem foram mantidos.

## Projects e Productivity

Projects persiste apenas `title`, `description` e `status`, os campos efetivamente presentes no schema. Cada card expõe edição e exclusão confirmada. O progresso vem da razão entre tarefas associadas e concluídas, nunca de porcentagem arbitrária. Tasks têm título, descrição, prioridade, vencimento e FK opcional de projeto no contrato. Productivity oferece busca, filtros All/Today/Open/Done, criação/edição, completar/reabrir e excluir. Mutations invalidam somente as respectivas query keys.

## Demais módulos

- **Studies:** schema suporta matéria (`name`, `color`) e sessão (`duration`, `completed`, `subject_id`); total e progresso são calculáveis. Cronômetro real não deve ser alegado.
- **Finance:** contas e transações suportam CRUD e resumo real. `FinanceGoal` é adaptador legado, não persistência de meta; a interface não deve apresentá-lo como meta em evolução futura.
- **Documents/Content:** documentos persistem título/conteúdo/tipo; `files` é independente. Drafts usam `documents(type=draft)`; transformações chamam backend seguro.
- **Agents:** agents e agent_runs existem; execução chama Edge Function, sem modelo/secret no frontend.
- **Translate:** somente resultado de provedor não vazio é persistido.
- **Dashboard/Search/Notifications/Premium/Settings:** boundaries de service e React Query existentes foram auditadas e mantidas.

## Responsividade e acessibilidade

A revisão estática cobriu 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440 px. Novos formulários usam Dialog responsivo existente, grids passam a coluna única, ações têm labels e alvos touch, filtros têm overflow interno e o shell contém overflow horizontal. No Assistant, histórico vira Sheet abaixo de `lg`, mensagens têm overflow próprio, composer inclui safe area e o viewport usa unidades dinâmicas. Em tablet os grids usam duas colunas; em desktop o Assistant mantém sidebar e conteúdo limitado.

## Arquitetura e segurança

Rotas continuam sem import direto do cliente Supabase. Services obtêm o usuário autenticado e aplicam `user_id`; React Query é a cache da UI. Não foram adicionadas chaves, secrets, regras Premium, chamadas diretas à OpenAI nem mocks de produção. Demo permanece exclusivamente condicionado a `VITE_DEMO_MODE`.

## Bloqueios por schema

1. Projects não têm objetivo, prioridade, start date ou deadline. Migration futura mínima: colunas nullable correspondentes, tipos regenerados e policies existentes revisadas — não executada.
2. Study sessions não têm timestamps start/end; duração manual é o único comportamento honesto.
3. Não existe Finance Goal persistente. Uma tabela user-scoped seria necessária antes de oferecer metas.
4. `documents` e `files` não têm FK; associação/upload não pode ser inferida.
5. Push requer tabela user-scoped de subscriptions e policies antes do registro no frontend.

## Bloqueios externos

Testes autenticados ponta a ponta, persistência após novo login, IA, Stripe, push remoto, Play Store/TWA e auditoria em teclado Android físico exigem credenciais e infraestrutura de staging. O checkout não fornece um browser automatizado configurado; portanto não se declara validação visual real nem screenshots.

## Testes e próximos passos estritamente necessários

Foram executados check, lint, typecheck, build, diff check, ESLint direcionado e auditorias estáticas. O smoke test de rotas é o build do TanStack Router; fluxos autenticados não foram simulados como sucesso. Próximos passos: completar as UIs já suportadas de Studies, Finance, Documents, Content e Agents; provisionar push server-side; e executar E2E autenticado em staging e dispositivos Android/iOS reais.
