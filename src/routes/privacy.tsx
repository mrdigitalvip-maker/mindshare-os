import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, type LegalSection } from "@/components/legal-document";

const sectionsPt: LegalSection[] = [
  {
    title: "1. Quem opera o KIVRYN",
    paragraphs: [
      "KIVRYN é um produto da Aether Systems. Esta Política de Privacidade explica, de forma prática, como informações podem ser tratadas quando você usa o aplicativo, o site e recursos relacionados do KIVRYN.",
    ],
  },
  {
    title: "2. Informações que podem ser tratadas",
    bullets: [
      "Dados de conta e perfil, como nome, endereço de e-mail, identificadores de conta e preferências de idioma.",
      "Conteúdo que você cria ou envia ao KIVRYN, como projetos, tarefas, estudos, documentos, mensagens, prompts, respostas, configurações e dados de progresso.",
      "Dados necessários para recursos de IA, incluindo entradas enviadas por você e respostas geradas para fornecer o recurso solicitado.",
      "Dados técnicos e de dispositivo necessários para funcionamento, segurança e notificações, como sistema operacional, identificadores técnicos, token de push, estado de permissão e informações de diagnóstico.",
      "Registros de serviço e segurança necessários para autenticação, prevenção de abuso, investigação de falhas e manutenção da disponibilidade.",
    ],
  },
  {
    title: "3. Como usamos essas informações",
    bullets: [
      "Criar e manter sua conta, autenticar sessões e preservar suas preferências.",
      "Fornecer os módulos e recursos que você escolher usar.",
      "Processar solicitações de IA e entregar respostas relacionadas ao contexto fornecido por você.",
      "Enviar notificações que você autorizou e manter o registro técnico do dispositivo necessário para push.",
      "Proteger contas e infraestrutura, corrigir falhas e melhorar confiabilidade, desempenho e experiência do produto.",
      "Cumprir obrigações legais aplicáveis e responder a solicitações legítimas de autoridades quando exigido por lei.",
    ],
  },
  {
    title: "4. IA e conteúdo enviado",
    paragraphs: [
      "Alguns recursos enviam o conteúdo necessário a serviços de processamento de IA por meio da infraestrutura do KIVRYN. O conteúdo enviado deve ser limitado ao necessário para o recurso que você deseja usar. Respostas de IA podem conter erros e devem ser verificadas antes de decisões importantes.",
      "Não use o KIVRYN para inserir senhas, segredos de autenticação ou outros dados altamente sensíveis que não sejam necessários para a funcionalidade solicitada.",
    ],
  },
  {
    title: "5. Prestadores e infraestrutura",
    paragraphs: [
      "Para operar o produto, o KIVRYN utiliza provedores de infraestrutura, autenticação, banco de dados, hospedagem, notificações e processamento de IA. Esses prestadores podem processar dados somente na medida necessária para prestar seus serviços ao KIVRYN e estão sujeitos aos próprios termos e medidas de segurança.",
    ],
  },
  {
    title: "6. Notificações",
    paragraphs: [
      "Notificações são opcionais e dependem da permissão do sistema. Quando ativadas, o KIVRYN pode manter um token técnico do dispositivo para direcionar push. Você pode desativar o registro do aparelho no aplicativo e também controlar permissões nas configurações do sistema.",
    ],
  },
  {
    title: "7. Retenção e exclusão",
    paragraphs: [
      "Os dados são mantidos pelo tempo necessário para fornecer o serviço, preservar segurança e integridade, cumprir obrigações legais e resolver disputas. Quando aplicável, você pode solicitar acesso, correção ou exclusão de dados por meio dos canais oficiais de suporte publicados no site ou na listagem oficial do KIVRYN.",
    ],
  },
  {
    title: "8. Segurança",
    paragraphs: [
      "Aplicamos medidas técnicas e organizacionais razoáveis para reduzir riscos de acesso não autorizado, alteração, perda ou divulgação indevida. Nenhum serviço conectado à internet pode garantir segurança absoluta.",
    ],
  },
  {
    title: "9. Seus direitos",
    paragraphs: [
      "Dependendo de onde você reside, leis como a LGPD, o GDPR e outras normas de privacidade podem garantir direitos de confirmação de tratamento, acesso, correção, portabilidade, oposição, restrição ou exclusão. Pedidos serão tratados conforme a legislação aplicável e os limites legais de retenção.",
    ],
  },
  {
    title: "10. Crianças e adolescentes",
    paragraphs: [
      "O KIVRYN não é projetado para coleta intencional de dados de crianças sem a autorização exigida pela legislação aplicável. Usuários sem capacidade legal para consentir devem utilizar o serviço somente com autorização e supervisão adequadas.",
    ],
  },
  {
    title: "11. Transferências internacionais",
    paragraphs: [
      "Como os provedores de infraestrutura podem operar em diferentes países, dados podem ser processados fora do país onde você reside. Quando aplicável, adotamos mecanismos compatíveis com as exigências legais relevantes para esse processamento.",
    ],
  },
  {
    title: "12. Alterações e contato",
    paragraphs: [
      "Podemos atualizar esta Política quando o produto, os provedores ou os requisitos legais mudarem. A versão vigente será publicada nesta página. Para solicitações de privacidade, utilize o canal oficial de suporte informado no site ou na listagem oficial do KIVRYN na loja de aplicativos.",
    ],
  },
];

const sectionsEn: LegalSection[] = [
  {
    title: "1. Who operates KIVRYN",
    paragraphs: [
      "KIVRYN is a product of Aether Systems. This Privacy Policy explains, in practical terms, how information may be processed when you use the KIVRYN app, website and related features.",
    ],
  },
  {
    title: "2. Information we may process",
    bullets: [
      "Account and profile data such as name, email address, account identifiers and language preferences.",
      "Content you create or submit to KIVRYN, including projects, tasks, studies, documents, messages, prompts, responses, settings and progress data.",
      "Data required for AI features, including your inputs and generated responses needed to provide the requested feature.",
      "Technical and device data required for operation, security and notifications, such as operating system information, technical identifiers, push tokens, permission state and diagnostic information.",
      "Service and security logs required for authentication, abuse prevention, troubleshooting and service availability.",
    ],
  },
  {
    title: "3. How we use information",
    bullets: [
      "Create and maintain your account, authenticate sessions and preserve preferences.",
      "Provide the modules and features you choose to use.",
      "Process AI requests and return responses related to the context you provide.",
      "Send notifications you authorize and maintain the technical device registration required for push delivery.",
      "Protect accounts and infrastructure, troubleshoot failures and improve reliability, performance and product experience.",
      "Comply with applicable legal obligations and respond to valid authority requests when required by law.",
    ],
  },
  {
    title: "4. AI and submitted content",
    paragraphs: [
      "Some features send the content required for the request to AI processing services through KIVRYN infrastructure. Only submit information necessary for the feature you intend to use. AI responses may be inaccurate and should be verified before important decisions.",
      "Do not submit passwords, authentication secrets or other highly sensitive information unless it is strictly necessary for the requested functionality.",
    ],
  },
  {
    title: "5. Service providers and infrastructure",
    paragraphs: [
      "KIVRYN relies on providers for infrastructure, authentication, databases, hosting, notifications and AI processing. These providers may process information only to the extent needed to deliver their services to KIVRYN and are subject to their own terms and security measures.",
    ],
  },
  {
    title: "6. Notifications",
    paragraphs: [
      "Notifications are optional and depend on system permission. When enabled, KIVRYN may store a technical device token to route push messages. You can disable the device registration in the app and control system permissions in your device settings.",
    ],
  },
  {
    title: "7. Retention and deletion",
    paragraphs: [
      "Information is retained for as long as needed to provide the service, preserve security and integrity, meet legal obligations and resolve disputes. Where applicable, you may request access, correction or deletion through the official support channels published on the KIVRYN website or official store listing.",
    ],
  },
  {
    title: "8. Security",
    paragraphs: [
      "We apply reasonable technical and organizational measures designed to reduce the risk of unauthorized access, alteration, loss or improper disclosure. No internet-connected service can guarantee absolute security.",
    ],
  },
  {
    title: "9. Your rights",
    paragraphs: [
      "Depending on where you live, laws such as the LGPD, GDPR and other privacy rules may provide rights to confirmation, access, correction, portability, objection, restriction or deletion. Requests are handled under applicable law and lawful retention requirements.",
    ],
  },
  {
    title: "10. Children and minors",
    paragraphs: [
      "KIVRYN is not designed to intentionally collect data from children without authorization required by applicable law. Users who cannot legally consent should use the service only with appropriate authorization and supervision.",
    ],
  },
  {
    title: "11. International processing",
    paragraphs: [
      "Because infrastructure providers may operate in multiple countries, information may be processed outside your country of residence. Where required, we use mechanisms intended to support applicable legal requirements for such processing.",
    ],
  },
  {
    title: "12. Changes and contact",
    paragraphs: [
      "We may update this Policy when the product, providers or legal requirements change. The current version will be published on this page. For privacy requests, use the official support channel published on the KIVRYN website or official app-store listing.",
    ],
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — KIVRYN" },
      {
        name: "description",
        content: "KIVRYN privacy policy and information about data processing, AI, notifications and user rights.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalDocument
      titleEn="Privacy Policy"
      titlePt="Política de Privacidade"
      summaryEn="How KIVRYN handles account data, user content, AI requests, notifications and technical information."
      summaryPt="Como o KIVRYN trata dados de conta, conteúdo do usuário, solicitações de IA, notificações e informações técnicas."
      updatedEn="Effective and last updated: September 13, 2026"
      updatedPt="Vigência e última atualização: 13 de setembro de 2026"
      sectionsEn={sectionsEn}
      sectionsPt={sectionsPt}
      relatedHref="/terms"
      relatedLabelEn="Terms of Service"
      relatedLabelPt="Termos de Serviço"
    />
  );
}
