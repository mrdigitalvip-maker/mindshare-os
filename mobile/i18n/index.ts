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
