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
      "Dados de conta e perfil, como nome, endereço de e-mail, identificadores de conta, foto de perfil quando fornecida e preferências de idioma.",
      "Conteúdo que você cria ou envia ao KIVRYN, como projetos, tarefas, estudos, documentos, mensagens, prompts, respostas, configurações e dados de progresso.",
      "Dados necessários para recursos de IA, incluindo entradas enviadas por você e respostas geradas para fornecer o recurso solicitado.",
      "Dados técnicos e de dispositivo necessários para funcionamento, segurança e notificações, como sistema operacional, identificadores técnicos, token de push, estado de permissão e informações de diagnóstico.",
      "Registros de serviço e segurança necessários para autenticação, prevenção de abuso, investigação de falhas e manutenção da disponibilidade.",
    ],
  },
  {
    title: "3. Login com Google e dados de usuário do Google",
    paragraphs: [
      "Quando você escolhe Entrar com Google, o KIVRYN usa o fluxo OAuth do Google para autenticar sua conta. No fluxo de login atual, solicitamos apenas informações básicas de identidade necessárias para autenticação e criação da conta, como o identificador da sua Conta Google, nome, endereço de e-mail e imagem de perfil quando disponibilizada pelo Google.",
      "O KIVRYN não usa o Login com Google para ler o conteúdo do Gmail, Google Drive, Google Fotos, Google Agenda, contatos ou outros produtos Google que não sejam necessários ao fluxo de autenticação descrito acima.",
      "Se futuramente um recurso opcional solicitar acesso adicional a uma API do Google, esse acesso será solicitado separadamente, com escopos específicos e consentimento correspondente, e esta Política será atualizada para descrever a finalidade antes do uso em produção.",
    ],
    bullets: [
      "Uso: identificar você, criar ou localizar sua conta KIVRYN, autenticar sessões e exibir informações básicas de perfil associadas à sua conta.",
      "Armazenamento: os dados básicos de conta necessários ao serviço podem ser armazenados na infraestrutura de autenticação e banco de dados utilizada pelo KIVRYN enquanto sua conta estiver ativa ou pelo período necessário para segurança e obrigações legais.",
      "Compartilhamento: dados de usuário do Google não são vendidos. Eles podem ser processados apenas por provedores que operam a infraestrutura necessária ao KIVRYN, na medida necessária para autenticação, hospedagem, segurança e funcionamento do serviço, ou quando a lei exigir.",
      "Publicidade: dados obtidos por meio do Login com Google não são usados para publicidade direcionada nem vendidos a anunciantes.",
      "Revogação: você pode revogar o acesso do KIVRYN à sua Conta Google nas configurações de segurança/permissões da sua Conta Google. Você também pode solicitar exclusão dos dados da sua conta KIVRYN pelos canais indicados nesta Política.",
    ],
  },
  {
    title: "4. Como usamos essas informações",
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
    title: "5. IA e conteúdo enviado",
    paragraphs: [
      "Alguns recursos enviam o conteúdo necessário a serviços de processamento de IA por meio da infraestrutura do KIVRYN. O conteúdo enviado deve ser limitado ao necessário para o recurso que você deseja usar. Respostas de IA podem conter erros e devem ser verificadas antes de decisões importantes.",
      "Não use o KIVRYN para inserir senhas, segredos de autenticação ou outros dados altamente sensíveis que não sejam necessários para a funcionalidade solicitada.",
    ],
  },
  {
    title: "6. Prestadores e infraestrutura",
    paragraphs: [
      "Para operar o produto, o KIVRYN utiliza provedores de infraestrutura, autenticação, banco de dados, hospedagem, notificações e processamento de IA. Esses prestadores podem processar dados somente na medida necessária para prestar seus serviços ao KIVRYN e estão sujeitos aos próprios termos, obrigações de confidencialidade quando aplicáveis e medidas de segurança.",
      "O uso de dados recebidos das APIs do Google pelo KIVRYN observa as políticas aplicáveis do Google API Services User Data Policy, incluindo os requisitos de Limited Use quando aplicáveis.",
    ],
  },
  {
    title: "7. Notificações",
    paragraphs: [
      "Notificações são opcionais e dependem da permissão do sistema. Quando ativadas, o KIVRYN pode manter um token técnico do dispositivo para direcionar push. Você pode desativar o registro do aparelho no aplicativo e também controlar permissões nas configurações do sistema.",
    ],
  },
  {
    title: "8. Retenção, acesso e exclusão",
    paragraphs: [
      "Os dados são mantidos pelo tempo necessário para fornecer o serviço, preservar segurança e integridade, cumprir obrigações legais e resolver disputas. Quando aplicável, você pode solicitar acesso, correção ou exclusão de dados da sua conta.",
      "A exclusão de uma conta pode exigir retenção limitada de registros quando necessária por razões de segurança, prevenção de fraude, cumprimento de obrigação legal ou resolução de disputas. Fora dessas hipóteses, dados associados à conta serão excluídos ou anonimizados de acordo com o processo aplicável.",
    ],
  },
  {
    title: "9. Segurança",
    paragraphs: [
      "Aplicamos medidas técnicas e organizacionais razoáveis para reduzir riscos de acesso não autorizado, alteração, perda ou divulgação indevida. Credenciais OAuth e outros segredos de autenticação não devem ser expostos ao cliente além do necessário para os fluxos seguros de autenticação. Nenhum serviço conectado à internet pode garantir segurança absoluta.",
    ],
  },
  {
    title: "10. Seus direitos",
    paragraphs: [
      "Dependendo de onde você reside, leis como a LGPD, o GDPR e outras normas de privacidade podem garantir direitos de confirmação de tratamento, acesso, correção, portabilidade, oposição, restrição ou exclusão. Pedidos serão tratados conforme a legislação aplicável e os limites legais de retenção.",
    ],
  },
  {
    title: "11. Crianças e adolescentes",
    paragraphs: [
      "O KIVRYN não é projetado para coleta intencional de dados de crianças sem a autorização exigida pela legislação aplicável. Usuários sem capacidade legal para consentir devem utilizar o serviço somente com autorização e supervisão adequadas.",
    ],
  },
  {
    title: "12. Transferências internacionais",
    paragraphs: [
      "Como os provedores de infraestrutura podem operar em diferentes países, dados podem ser processados fora do país onde você reside. Quando aplicável, adotamos mecanismos compatíveis com as exigências legais relevantes para esse processamento.",
    ],
  },
  {
    title: "13. Alterações e contato",
    paragraphs: [
      "Podemos atualizar esta Política quando o produto, os provedores ou os requisitos legais mudarem. A versão vigente será publicada nesta página.",
      "Para dúvidas, solicitações de privacidade, acesso, correção ou exclusão de dados, entre em contato pelo e-mail mrdigitalvip@gmail.com.",
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
      "Account and profile data such as name, email address, account identifiers, profile image when provided and language preferences.",
      "Content you create or submit to KIVRYN, including projects, tasks, studies, documents, messages, prompts, responses, settings and progress data.",
      "Data required for AI features, including your inputs and generated responses needed to provide the requested feature.",
      "Technical and device data required for operation, security and notifications, such as operating system information, technical identifiers, push tokens, permission state and diagnostic information.",
      "Service and security logs required for authentication, abuse prevention, troubleshooting and service availability.",
    ],
  },
  {
    title: "3. Sign in with Google and Google user data",
    paragraphs: [
      "When you choose Sign in with Google, KIVRYN uses Google's OAuth flow to authenticate your account. In the current sign-in flow, we request only basic identity information required for authentication and account creation, such as your Google Account identifier, name, email address and profile image when Google makes it available.",
      "KIVRYN does not use Sign in with Google to read the contents of Gmail, Google Drive, Google Photos, Google Calendar, contacts or other Google products that are not required for the authentication flow described above.",
      "If a future optional feature requests access to an additional Google API, that access will be requested separately with specific scopes and corresponding consent, and this Policy will be updated to describe the purpose before production use.",
    ],
    bullets: [
      "Use: identify you, create or locate your KIVRYN account, authenticate sessions and display basic profile information associated with your account.",
      "Storage: basic account data required to provide the service may be stored in the authentication and database infrastructure used by KIVRYN while your account remains active or for the period needed for security and legal obligations.",
      "Sharing: Google user data is not sold. It may be processed only by providers that operate infrastructure required by KIVRYN, to the extent needed for authentication, hosting, security and service operation, or when required by law.",
      "Advertising: data obtained through Sign in with Google is not used for targeted advertising and is not sold to advertisers.",
      "Revocation: you may revoke KIVRYN's access from the security/permissions settings of your Google Account. You may also request deletion of KIVRYN account data through the contact channel listed in this Policy.",
    ],
  },
  {
    title: "4. How we use information",
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
    title: "5. AI and submitted content",
    paragraphs: [
      "Some features send the content required for the request to AI processing services through KIVRYN infrastructure. Only submit information necessary for the feature you intend to use. AI responses may be inaccurate and should be verified before important decisions.",
      "Do not submit passwords, authentication secrets or other highly sensitive information unless it is strictly necessary for the requested functionality.",
    ],
  },
  {
    title: "6. Service providers and infrastructure",
    paragraphs: [
      "KIVRYN relies on providers for infrastructure, authentication, databases, hosting, notifications and AI processing. These providers may process information only to the extent needed to deliver their services to KIVRYN and are subject to their own terms, applicable confidentiality obligations and security measures.",
      "KIVRYN's use of information received from Google APIs follows the applicable Google API Services User Data Policy, including Limited Use requirements where applicable.",
    ],
  },
  {
    title: "7. Notifications",
    paragraphs: [
      "Notifications are optional and depend on system permission. When enabled, KIVRYN may store a technical device token to route push messages. You can disable the device registration in the app and control system permissions in your device settings.",
    ],
  },
  {
    title: "8. Retention, access and deletion",
    paragraphs: [
      "Information is retained for as long as needed to provide the service, preserve security and integrity, meet legal obligations and resolve disputes. Where applicable, you may request access, correction or deletion of your account data.",
      "Account deletion may require limited retention of records where necessary for security, fraud prevention, compliance with law or dispute resolution. Outside those cases, data associated with the account will be deleted or anonymized in accordance with the applicable process.",
    ],
  },
  {
    title: "9. Security",
    paragraphs: [
      "We apply reasonable technical and organizational measures designed to reduce the risk of unauthorized access, alteration, loss or improper disclosure. OAuth credentials and other authentication secrets should not be exposed to clients beyond what is necessary for secure authentication flows. No internet-connected service can guarantee absolute security.",
    ],
  },
  {
    title: "10. Your rights",
    paragraphs: [
      "Depending on where you live, laws such as the LGPD, GDPR and other privacy rules may provide rights to confirmation, access, correction, portability, objection, restriction or deletion. Requests are handled under applicable law and lawful retention requirements.",
    ],
  },
  {
    title: "11. Children and minors",
    paragraphs: [
      "KIVRYN is not designed to intentionally collect data from children without authorization required by applicable law. Users who cannot legally consent should use the service only with appropriate authorization and supervision.",
    ],
  },
  {
    title: "12. International processing",
    paragraphs: [
      "Because infrastructure providers may operate in multiple countries, information may be processed outside your country of residence. Where required, we use mechanisms intended to support applicable legal requirements for such processing.",
    ],
  },
  {
    title: "13. Changes and contact",
    paragraphs: [
      "We may update this Policy when the product, providers or legal requirements change. The current version will be published on this page.",
      "For questions or requests concerning privacy, access, correction or deletion of data, contact mrdigitalvip@gmail.com.",
    ],
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — KIVRYN" },
      {
        name: "description",
        content: "KIVRYN privacy policy covering account data, Google sign-in data, AI processing, notifications, retention, deletion and user rights.",
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
      summaryEn="How KIVRYN handles account data, Google sign-in data, user content, AI requests, notifications and technical information."
      summaryPt="Como o KIVRYN trata dados de conta, dados do Login com Google, conteúdo do usuário, solicitações de IA, notificações e informações técnicas."
      updatedEn="Effective and last updated: September 14, 2026"
      updatedPt="Vigência e última atualização: 14 de setembro de 2026"
      sectionsEn={sectionsEn}
      sectionsPt={sectionsPt}
      relatedHref="/terms"
      relatedLabelEn="Terms of Service"
      relatedLabelPt="Termos de Serviço"
    />
  );
}
