import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, type LegalSection } from "@/components/legal-document";

const sectionsPt: LegalSection[] = [
  {
    title: "1. Aceitação dos termos",
    paragraphs: [
      "Ao criar uma conta ou utilizar o KIVRYN, você concorda com estes Termos de Serviço e com a Política de Privacidade aplicável ao produto. Se você não concordar, não utilize o serviço.",
    ],
  },
  {
    title: "2. Conta e segurança",
    bullets: [
      "Você é responsável por manter suas credenciais seguras e por atividades realizadas em sua conta.",
      "As informações fornecidas devem ser razoavelmente corretas e não podem ser usadas para se passar por outra pessoa.",
      "Podemos limitar ou suspender acesso quando houver indícios de fraude, abuso, risco de segurança ou violação destes Termos.",
    ],
  },
  {
    title: "3. Uso permitido",
    paragraphs: [
      "Você pode usar o KIVRYN para fins pessoais e profissionais lícitos, respeitando direitos de terceiros e as limitações de cada recurso.",
    ],
    bullets: [
      "Não use o serviço para atividades ilegais, fraudulentas, abusivas ou que violem direitos de terceiros.",
      "Não tente contornar controles de acesso, limites de segurança ou proteções técnicas.",
      "Não interfira de forma intencional na disponibilidade, integridade ou segurança da plataforma.",
      "Não utilize automação ou engenharia reversa de forma que viole a lei, estes Termos ou direitos aplicáveis.",
    ],
  },
  {
    title: "4. Seu conteúdo",
    paragraphs: [
      "Você mantém os direitos que já possui sobre o conteúdo que cria ou envia ao KIVRYN. Para operar os recursos que você solicita, você nos autoriza a armazenar, processar, transmitir e exibir esse conteúdo na medida necessária para prestar o serviço.",
      "Você é responsável por garantir que possui os direitos e autorizações necessários para o conteúdo enviado e que esse conteúdo não viola a lei ou direitos de terceiros.",
    ],
  },
  {
    title: "5. Recursos de inteligência artificial",
    paragraphs: [
      "Recursos de IA podem gerar informações incompletas, incorretas ou inadequadas. As respostas servem como apoio e não substituem aconselhamento médico, jurídico, financeiro, de segurança ou outro serviço profissional qualificado.",
      "Você continua responsável por revisar resultados antes de utilizá-los em decisões, publicações, operações ou ações que possam produzir consequências relevantes.",
    ],
  },
  {
    title: "6. Funcionalidades e disponibilidade",
    paragraphs: [
      "O KIVRYN é desenvolvido continuamente. Recursos podem ser adicionados, alterados, limitados ou removidos para melhorar o produto, preservar segurança, cumprir requisitos legais ou manter a operação sustentável. Podemos realizar manutenção e não garantimos disponibilidade ininterrupta.",
    ],
  },
  {
    title: "7. Premium e pagamentos",
    paragraphs: [
      "Na versão Android atual, a área Premium pode ser apenas informativa e a contratação de novas assinaturas pode não estar habilitada. Quando uma compra estiver disponível, condições de preço, renovação, cancelamento e reembolso serão apresentadas no fluxo aplicável e poderão também ser regidas pela loja ou pelo processador de pagamento utilizado.",
    ],
  },
  {
    title: "8. Propriedade intelectual do KIVRYN",
    paragraphs: [
      "O software, a identidade visual, os elementos de interface, marcas, textos proprietários e demais materiais do KIVRYN pertencem à Aether Systems ou a seus licenciadores, salvo quando indicado de outra forma. Estes Termos não transferem a você direitos de propriedade sobre o produto.",
    ],
  },
  {
    title: "9. Encerramento e suspensão",
    paragraphs: [
      "Você pode deixar de usar o KIVRYN a qualquer momento. Podemos restringir ou suspender contas quando necessário para segurança, cumprimento legal, prevenção de abuso ou violação material destes Termos. Quando aplicável, solicitações relacionadas à conta e aos dados podem ser feitas pelos canais oficiais de suporte.",
    ],
  },
  {
    title: "10. Isenções e responsabilidade",
    paragraphs: [
      "O KIVRYN é fornecido conforme disponível. Na extensão permitida pela legislação aplicável, não garantimos que todo conteúdo, integração ou resultado gerado por IA será exato, completo, adequado ou livre de interrupções.",
      "Nada nestes Termos exclui direitos ou garantias que não possam ser afastados pela legislação de proteção ao consumidor ou outras normas obrigatórias aplicáveis.",
    ],
  },
  {
    title: "11. Alterações",
    paragraphs: [
      "Podemos atualizar estes Termos para refletir mudanças no produto, na infraestrutura ou em requisitos legais. A versão vigente será publicada nesta página com a data de atualização. Alterações materiais podem ser destacadas por meios razoáveis quando apropriado.",
    ],
  },
  {
    title: "12. Lei aplicável e contato",
    paragraphs: [
      "Estes Termos devem ser interpretados de acordo com a legislação aplicável, incluindo normas obrigatórias de proteção ao consumidor e de dados. Para dúvidas sobre estes Termos, utilize o canal oficial de suporte publicado no site ou na listagem oficial do KIVRYN na loja de aplicativos.",
    ],
  },
];

const sectionsEn: LegalSection[] = [
  {
    title: "1. Acceptance of terms",
    paragraphs: [
      "By creating an account or using KIVRYN, you agree to these Terms of Service and the Privacy Policy that applies to the product. If you do not agree, do not use the service.",
    ],
  },
  {
    title: "2. Account and security",
    bullets: [
      "You are responsible for keeping your credentials secure and for activity performed through your account.",
      "Information you provide should be reasonably accurate and must not be used to impersonate another person.",
      "We may limit or suspend access where there are signs of fraud, abuse, security risk or a violation of these Terms.",
    ],
  },
  {
    title: "3. Permitted use",
    paragraphs: [
      "You may use KIVRYN for lawful personal and professional purposes while respecting third-party rights and the limits of each feature.",
    ],
    bullets: [
      "Do not use the service for illegal, fraudulent or abusive activity, or to violate third-party rights.",
      "Do not attempt to bypass access controls, safety limits or technical protections.",
      "Do not intentionally interfere with the availability, integrity or security of the platform.",
      "Do not use automation or reverse engineering in a way that violates law, these Terms or applicable rights.",
    ],
  },
  {
    title: "4. Your content",
    paragraphs: [
      "You keep the rights you already hold in content you create or submit to KIVRYN. To operate the features you request, you authorize us to store, process, transmit and display that content only as needed to provide the service.",
      "You are responsible for ensuring that you have the rights and permissions required for submitted content and that it does not violate law or third-party rights.",
    ],
  },
  {
    title: "5. Artificial intelligence features",
    paragraphs: [
      "AI features may generate incomplete, inaccurate or unsuitable information. Responses are provided as assistance and do not replace medical, legal, financial, safety or other qualified professional advice.",
      "You remain responsible for reviewing outputs before using them in decisions, publications, operations or actions that may have meaningful consequences.",
    ],
  },
  {
    title: "6. Features and availability",
    paragraphs: [
      "KIVRYN is continuously developed. Features may be added, changed, limited or removed to improve the product, preserve security, meet legal requirements or maintain sustainable operation. Maintenance may occur and uninterrupted availability is not guaranteed.",
    ],
  },
  {
    title: "7. Premium and payments",
    paragraphs: [
      "In the current Android release, the Premium area may be informational only and new subscription purchases may not be enabled. When a purchase is available, pricing, renewal, cancellation and refund terms will be shown in the applicable flow and may also be governed by the relevant store or payment processor.",
    ],
  },
  {
    title: "8. KIVRYN intellectual property",
    paragraphs: [
      "The software, visual identity, interface elements, trademarks, proprietary text and other KIVRYN materials belong to Aether Systems or its licensors unless stated otherwise. These Terms do not transfer ownership rights in the product to you.",
    ],
  },
  {
    title: "9. Suspension and termination",
    paragraphs: [
      "You may stop using KIVRYN at any time. We may restrict or suspend accounts when needed for security, legal compliance, abuse prevention or material violations of these Terms. Where applicable, account and data requests can be made through official support channels.",
    ],
  },
  {
    title: "10. Disclaimers and liability",
    paragraphs: [
      "KIVRYN is provided as available. To the extent permitted by applicable law, we do not guarantee that all content, integrations or AI-generated results will be accurate, complete, suitable or uninterrupted.",
      "Nothing in these Terms excludes rights or guarantees that cannot lawfully be waived under consumer-protection rules or other mandatory law.",
    ],
  },
  {
    title: "11. Changes",
    paragraphs: [
      "We may update these Terms to reflect changes in the product, infrastructure or legal requirements. The current version will be published on this page with its revision date. Material changes may be highlighted through reasonable channels where appropriate.",
    ],
  },
  {
    title: "12. Applicable law and contact",
    paragraphs: [
      "These Terms are interpreted under applicable law, including mandatory consumer and data-protection rules. For questions about these Terms, use the official support channel published on the KIVRYN website or official app-store listing.",
    ],
  },
];

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — KIVRYN" },
      {
        name: "description",
        content: "Terms governing the use of KIVRYN, including accounts, user content, AI features and service availability.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalDocument
      titleEn="Terms of Service"
      titlePt="Termos de Serviço"
      summaryEn="The rules for using KIVRYN responsibly, including accounts, user content, AI features and service availability."
      summaryPt="As regras para usar o KIVRYN de forma responsável, incluindo conta, conteúdo do usuário, recursos de IA e disponibilidade do serviço."
      updatedEn="Effective and last updated: September 13, 2026"
      updatedPt="Vigência e última atualização: 13 de setembro de 2026"
      sectionsEn={sectionsEn}
      sectionsPt={sectionsPt}
      relatedHref="/privacy"
      relatedLabelEn="Privacy Policy"
      relatedLabelPt="Política de Privacidade"
    />
  );
}
