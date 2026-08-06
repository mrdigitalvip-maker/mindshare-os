# Manifesto NEXORA

## Missão, visão e propósito

O NEXORA existe para reunir pensamento, execução e aprendizado em um espaço pessoal coerente.
Sua missão é reduzir a fragmentação do trabalho digital sem retirar do usuário o controle sobre
seus dados e decisões. A visão permanece a de um sistema operacional pessoal no qual IA é uma
capacidade transversal — útil, contextual e transparente — e não um substituto para julgamento.

## Produto atual

O produto reúne Dashboard com indicadores derivados dos dados persistidos, Assistant com
conversas e histórico, Projects, Productivity, Documents, Content, Studies, Finance, Translate,
Agents, busca global, notificações, perfil e preferências. Autenticação, onboarding, recuperação
de senha e confirmação de e-mail formam a entrada; Stripe Checkout e Customer Portal formam o
ciclo de assinatura.

## Arquitetura e confiança

O frontend TanStack Start acessa dados por services. Supabase oferece autenticação, persistência,
storage e isolamento por RLS. Operações OpenAI e Stripe que exigem segredo são executadas em Edge
Functions. O navegador recebe somente URL e chave anônima do Supabase. Erros de integrações reais
não são convertidos em sucesso fictício; dados demonstrativos existem apenas no modo explicitamente
habilitado.

## Free, Premium e IA

O plano Free preserva uma experiência útil com limites controlados no backend. Premium amplia
limites e libera capacidades avançadas, sempre com entitlement confirmado pelo estado persistido
da assinatura, nunca pelo retorno do navegador. Conteúdo gerado por IA deve permanecer identificável,
editável e sujeito à revisão humana.

## Privacidade

O NEXORA aplica minimização de dados, separação por usuário e segredos fora do cliente. Logs não
devem conter credenciais nem conteúdo sensível desnecessário. Exclusão, retenção, consentimento e
requisitos regulatórios continuam sendo responsabilidades de operação antes da disponibilidade
pública em cada jurisdição.

## Roadmap

O roadmap prioriza robustez, observabilidade, acessibilidade, portabilidade de dados e validação
com usuários. Novas capacidades somente devem avançar quando os fluxos atuais tiverem métricas,
contratos estáveis e proteção de privacidade compatível com a confiança depositada no produto.
