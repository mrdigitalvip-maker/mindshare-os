# NEXORA — auditoria da rodada Premium Functional Rebuild

## Escopo e método

A implementação foi auditada do route shell até os services, tipos Supabase e Edge Functions. A validação local cobre análise estática, TypeScript, ESLint, build de produção, divisão de chunks e PWA. Operações autenticadas contra produção não foram simuladas: o checkout não contém uma conta de teste nem valores dos secrets de produção.

## Causas raiz e correções

1. **Traduzir disparava uma chamada por alteração de texto.** O `useEffect` com debounce criava novas invocações enquanto o usuário digitava. Cancelar o efeito apenas ignorava a resposta no cliente; não garantia o cancelamento do trabalho já recebido pela Edge Function. Isso consumia limites, permitia respostas concorrentes e confundia falhas reais. A rota agora envia somente por ação explícita, bloqueia duplicidade, valida idiomas e tamanho, mantém erro visível e oferece retry.
2. **Traduzir não oferecia detecção automática embora o backend já aceitasse `auto`.** A opção agora é exposta sem simular detecção no cliente. A detecção/tradução continua sendo responsabilidade do provider real.
3. **O estado de tradução escondia o erro em um toast efêmero.** Falhas agora removem qualquer resultado anterior e ficam no painel, sem fallback inventado. O fluxo real permanece `TranslationService` → `ai-chat` → OpenAI; a Edge Function persiste apenas a resposta bem-sucedida em `translations` com `user_id`.
4. **Cache de Conteúdo não era segregado por usuário.** A query key global podia manter drafts do usuário anterior no cache do browser após troca de sessão. As rotas de lista e editor agora usam chave contendo o ID autenticado e só consultam depois da autenticação.
5. **Conteúdo confundia falha com estado vazio.** Lista e editor agora distinguem loading, erro, vazio e dado ausente, preservando o CRUD e geração existentes.
6. **Estudos tinha apresentação de dashboard superficial.** O overview ganhou hierarquia própria e métricas calculadas exclusivamente dos planos/sessões retornados pelo service. Não foram criados objetivos, notas, quizzes ou gráficos porque o schema atual não persiste esses recursos.

## Auditoria por workspace

### Studio

O design aprovado não foi alterado. A inspeção confirmou que navegação, upload de mídia, criação/recuperação de projetos, persistência de cenas e configurações, geração por IA e export usam `StudioService`; os estados de operação e bloqueios de requests existentes foram preservados. Testes reais de Storage/IA/export dependem de sessão e infraestrutura configuradas e permanecem pendentes de staging.

### Estudos

As rotas são carregadas por chunks próprios. `StudyService` lê matérias e sessões em paralelo, filtra pelo usuário, calcula progresso a partir de sessões persistidas e expõe criação, edição, exclusão, registro/conclusão de sessão e assistência via IA. O erro global observado é compatível com ausência/incompatibilidade das tabelas/policies no ambiente remoto; no cliente, queries agora ficam atrás da sessão e têm boundaries locais de loading/error/not-found. A migration que originalmente criou essas tabelas não está neste checkout, portanto não foi inventada uma migration duplicada. É necessário verificar no projeto Supabase de produção se `study_subjects` e `study_sessions` e suas RLS correspondem aos tipos versionados.

### Traduzir

Provider: OpenAI, exclusivamente via `supabase/functions/ai-chat`. A Edge Function valida plano/limite, input e idiomas, aplica timeout/provider errors e persiste o resultado. A UI suporta `auto`, troca segura, Unicode nativo, dez opções de idioma, limite de 12.000 caracteres no cliente, loading, retry, cópia e prevenção de duplicidade. A Edge Function continua impondo limite menor para contas free; esse erro é mostrado honestamente.

### Conteúdo

O workspace existente mantém drafts em `documents(type=draft)`, editor, duplicação, exclusão e transformações reais via IA. Foram adicionados boundaries operacionais e isolamento de cache. Não foram criados templates/projetos sem contrato de banco.

### Projetos e Produtividade

A implementação existente já oferece CRUD, confirmação de exclusão, busca/filtros, status, prioridades e datas de tarefas. Progresso de projeto deriva de tarefas associadas. Não houve alteração nesta rodada; a auditoria confirmou que o schema de projetos não possui prioridade ou prazo, logo a UI não deve alegá-los.

### Assistente

A rota existente já usa histórico persistido em `ai_conversations`/`ai_messages`, sidebar desktop, Sheet mobile, criar/abrir/renomear/excluir/continuar conversa, transcript com scroll próprio, composer com safe area e viewport dinâmica. O backend não oferece streaming real e a UI não o simula. Nenhuma alteração adicional foi necessária nesta rodada.

## Performance

O build confirma route splitting: Estudos, detalhe de matéria, Traduzir, Conteúdo, editor, Studio e Assistente são chunks independentes. Antes das alterações, Traduzir gerava uma request após cada pausa de 600 ms durante digitação; depois, gera exatamente uma request por submit explícito. O bundle inicial ainda contém um chunk acima de 500 kB (565,46 kB / 174,01 kB gzip na medição inicial), risco que requer profiling de dependências do runtime/TanStack antes de remoção segura. Supabase permanece em chunk separado (208,41 kB / 53,86 kB gzip).

## Banco, backend e configuração

- **Migrations criadas:** nenhuma.
- **Edge Functions alteradas/criadas:** nenhuma; `ai-chat` existente foi reutilizada.
- **Alterações de banco:** nenhuma.
- **Variáveis necessárias (somente nomes):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

## Pendências externas, funcionalidades não alegadas e riscos

- Tradução, assistência de estudos, geração de conteúdo e chat exigem `OPENAI_API_KEY`, Edge Functions implantadas e entitlement válido.
- Persistência exige migrations e RLS implantadas no mesmo projeto Supabase apontado pelo frontend.
- Testes ponta a ponta de autenticação, persistência após reload, Storage, IA e provider error exigem staging/credenciais; não foram substituídos por mocks.
- Objetivos, notas, materiais, quizzes, flashcards persistidos e planos detalhados de estudo não possuem tabelas no contrato atual. A IA pode produzir texto, mas isso não equivale a esses produtos persistidos; portanto eles não são declarados implementados.
- Templates e projetos editoriais também não têm contrato próprio; drafts reais foram preservados.
- Teste de teclado Android/TWA e Play Store deve ocorrer em dispositivo, sem alterar a configuração Android desta rodada.
- O chunk inicial grande permanece um risco de cold start. Remover bibliotecas sem profiling de cobertura pode quebrar o shell; recomenda-se medir com browser/staging e estabelecer orçamento de bundle em CI.
