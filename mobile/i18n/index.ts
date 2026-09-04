export type LanguagePreference = "system" | "pt-BR" | "en";
export type ResolvedLocale = "pt-BR" | "en";

export const LANGUAGE_STORAGE_KEY = "nexora.ui-language.v1";

export function resolveLocale(
  preference: LanguagePreference,
  deviceLocale?: string,
): ResolvedLocale {
  if (preference !== "system") return preference;
  const locale = (deviceLocale ?? Intl.DateTimeFormat().resolvedOptions().locale).toLowerCase();
  return locale === "pt" || locale.startsWith("pt-") ? "pt-BR" : "en";
}

export const translations = {
  "pt-BR": {
    "common.back": "Voltar",
    "common.cancel": "Cancelar",
    "common.create": "Criar",
    "common.delete": "Excluir",
    "common.loading": "Carregando…",
    "common.retry": "Tentar novamente",
    "common.save": "Salvar",
    "nav.home": "Início",
    "nav.assistant": "Assistente",
    "nav.productivity": "Produtividade",
    "nav.projects": "Projetos",
    "nav.more": "Mais",
    "settings.title": "Configurações",
    "settings.language": "Idioma",
    "settings.languageHelp": "Escolha o idioma da interface neste dispositivo.",
    "language.system": "Automático — usar idioma do dispositivo",
    "language.pt-BR": "Português (Brasil)",
    "language.en": "English",
    "creator.title": "NEXORA CREATOR CENTER",
    "creator.tagline": "Crie. Corte. Publique.",
    "creator.studio": "VIRAL CLIPS STUDIO",
    "creator.ideas": "Ideias e Hooks",
    "creator.guide": "Guia do Criador",
    "creator.ideasBody":
      "Estruture uma abertura clara, entregue contexto e encerre cada ideia por completo.",
    "creator.guideBody":
      "Use apenas vídeos próprios ou fontes que você tem autorização para processar.",
    "creator.recent": "Projetos recentes",
    "creator.empty": "Você ainda não criou projetos. Comece com um vídeo original.",
    "creator.new": "Novo projeto",
    "creator.projectTitle": "Título do projeto",
    "creator.source": "Fonte do vídeo",
    "creator.local": "Escolher vídeo do dispositivo",
    "creator.url": "URL para identificação",
    "creator.originalRequired": "Envie o arquivo original deste vídeo para continuar.",
    "creator.aspect": "Formato",
    "creator.duration": "Duração alvo",
    "creator.captions": "Legendas",
    "creator.captionsAuto": "Automáticas",
    "creator.captionsOff": "Desativadas",
    "creator.foundation":
      "O processamento de vídeo será disponibilizado na próxima etapa. Nenhum clipe é criado sem processamento real.",
    "creator.invalidRoute": "Este projeto de criação não está disponível.",
    "creator.loadError": "Não foi possível carregar seus projetos.",
    "creator.create": "CRIAR",
    "creator.plan": "PLANEJAR",
    "creator.learn": "APRENDER",
    "creator.analyze": "ANALISAR",
    "creator.intelligence": "INTELIGÊNCIA",
    "creator.media": "MÍDIA",
    "creator.ai": "IA",
    "creator.hookLab": "Laboratório de Hooks",
    "creator.captionSeo": "Legenda / SEO",
    "creator.profileBuilder": "Construtor de Perfil",
    "creator.contentIdeas": "Ideias de Conteúdo",
    "creator.setup": "Configuração do Criador",
    "creator.strategy": "Estratégia de Conteúdo",
    "creator.pillars": "Pilares de Conteúdo",
    "creator.postingPlan": "Plano de Publicação",
    "creator.goals": "Metas do Criador",
    "creator.academy": "Academia do Criador",
    "creator.start": "Início",
    "creator.growth": "Crescimento",
    "creator.pro": "Pro",
    "creator.analytics": "Analytics do Criador",
    "creator.contentScore": "Contrato de Content Score",
    "creator.retention": "Conceitos de retenção",
    "creator.history": "Histórico de desempenho",
    "creator.map": "Mapa do Criador",
    "creator.globalBenchmark": "BENCHMARK GLOBAL",
    "creator.yourAudience": "SEU PÚBLICO",
    "creator.library": "Biblioteca do Criador",
    "creator.upload": "Upload de arquivo original",
    "creator.authorizedImports": "Importações autorizadas",
    "creator.sourceStatus": "Status da fonte",
    "creator.copilot": "Contrato do Copiloto do Criador",
    "creator.notConnected": "Nenhuma conexão de plataforma existe ainda.",
    "creator.noBenchmarks": "Nenhum conjunto de benchmark real e atribuído foi carregado.",
    "creator.noAnalytics":
      "Conecte uma conta autorizada futuramente para ver métricas fornecidas pela plataforma.",
    "creator.noGenerated":
      "Nada foi gerado. Use o Assistente NEXORA quando a integração estiver disponível.",
    "creator.authImport":
      "Importações exigem uma conexão OAuth autorizada. Downloads arbitrários não são permitidos.",
    "notification.progress": "Hora de avançar em “{title}”.",
    "date.today": "Hoje",
    "date.yesterday": "Ontem",
  },
  en: {
    "common.back": "Back",
    "common.cancel": "Cancel",
    "common.create": "Create",
    "common.delete": "Delete",
    "common.loading": "Loading…",
    "common.retry": "Try again",
    "common.save": "Save",
    "nav.home": "Home",
    "nav.assistant": "Assistant",
    "nav.productivity": "Productivity",
    "nav.projects": "Projects",
    "nav.more": "More",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.languageHelp": "Choose the interface language on this device.",
    "language.system": "Automatic — use device language",
    "language.pt-BR": "Português (Brasil)",
    "language.en": "English",
    "creator.title": "NEXORA CREATOR CENTER",
    "creator.tagline": "Create. Cut. Publish.",
    "creator.studio": "VIRAL CLIPS STUDIO",
    "creator.ideas": "Ideas & Hooks",
    "creator.guide": "Creator Guide",
    "creator.ideasBody":
      "Build a clear opening, provide context, and bring each idea to a complete ending.",
    "creator.guideBody": "Use only your own videos or sources you are authorized to process.",
    "creator.recent": "Recent Creator Projects",
    "creator.empty": "You haven't created any projects yet. Start with an original video.",
    "creator.new": "New project",
    "creator.projectTitle": "Project title",
    "creator.source": "Video source",
    "creator.local": "Choose video from device",
    "creator.url": "URL for identification",
    "creator.originalRequired": "Upload the original video file to continue.",
    "creator.aspect": "Aspect ratio",
    "creator.duration": "Target duration",
    "creator.captions": "Captions",
    "creator.captionsAuto": "Automatic",
    "creator.captionsOff": "Off",
    "creator.foundation":
      "Video processing will be available in the next stage. No clip is created without real processing.",
    "creator.invalidRoute": "This creator project is not available.",
    "creator.loadError": "We couldn't load your projects.",
    "creator.create": "CREATE",
    "creator.plan": "PLAN",
    "creator.learn": "LEARN",
    "creator.analyze": "ANALYZE",
    "creator.intelligence": "INTELLIGENCE",
    "creator.media": "MEDIA",
    "creator.ai": "AI",
    "creator.hookLab": "Hook Lab",
    "creator.captionSeo": "Caption / SEO",
    "creator.profileBuilder": "Profile Builder",
    "creator.contentIdeas": "Content Ideas",
    "creator.setup": "Creator Setup",
    "creator.strategy": "Content Strategy",
    "creator.pillars": "Content Pillars",
    "creator.postingPlan": "Posting Plan",
    "creator.goals": "Creator Goals",
    "creator.academy": "Creator Academy",
    "creator.start": "Start",
    "creator.growth": "Growth",
    "creator.pro": "Pro",
    "creator.analytics": "Creator Analytics",
    "creator.contentScore": "Content Score contract",
    "creator.retention": "Retention concepts",
    "creator.history": "Performance history",
    "creator.map": "Creator Map",
    "creator.globalBenchmark": "GLOBAL BENCHMARK",
    "creator.yourAudience": "YOUR AUDIENCE",
    "creator.library": "Creator Library",
    "creator.upload": "Original-file upload",
    "creator.authorizedImports": "Authorized imports",
    "creator.sourceStatus": "Source status",
    "creator.copilot": "Creator Copilot contract",
    "creator.notConnected": "No platform connection exists yet.",
    "creator.noBenchmarks": "No real, attributed benchmark dataset has been loaded.",
    "creator.noAnalytics":
      "Connect an authorized account in the future to see metrics provided by that platform.",
    "creator.noGenerated":
      "Nothing has been generated. Use the NEXORA Assistant when integration is available.",
    "creator.authImport":
      "Imports require an authorized OAuth connection. Arbitrary downloads are not permitted.",
    "notification.progress": "Time to make progress on “{title}”.",
    "date.today": "Today",
    "date.yesterday": "Yesterday",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export function translate(
  locale: ResolvedLocale,
  key: TranslationKey,
  params: Record<string, string | number> = {},
) {
  const value: string | undefined = translations[locale][key] ?? translations.en[key];
  if (!value) return __DEV__ ? `[missing:${key}]` : "";
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function formatDateLabel(value: Date, locale: ResolvedLocale, now = new Date()) {
  const day = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (day === today) return translate(locale, "date.today");
  if (day === today - 86_400_000) return translate(locale, "date.yesterday");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    value,
  );
}
