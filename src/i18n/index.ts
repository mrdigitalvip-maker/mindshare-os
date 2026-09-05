export type LanguagePreference = "system" | "pt-BR" | "en";
export type ResolvedLocale = "pt-BR" | "en";

export const LANGUAGE_STORAGE_KEY = "nexora.web.ui-language.v1";

export const messages = {
  en: {
    "common.retry": "Try again",
    "common.loading": "Loading…",
    "common.noData": "No data yet",
    "shell.commandCenter": "Command center",
    "shell.search": "Search or ask NEXORA…",
    "shell.searchLabel": "Open workspace search",
    "shell.accountMenu": "Account menu",
    "shell.profileSettings": "Profile & settings",
    "shell.signOut": "Sign out",
    "shell.more": "More",
    "shell.moreLabel": "Open more modules",
    "shell.collapse": "Collapse sidebar",
    "shell.expand": "Expand sidebar",
    "shell.profileError": "We couldn't load your profile",
    "shell.profileErrorHelp": "Check your connection and try again. Your data remains safe.",
    "shell.signOutError": "We couldn't sign you out. Check your connection and try again.",
    "nav.group.command": "Command",
    "nav.group.execute": "Execute",
    "nav.group.learn": "Learn",
    "nav.group.create": "Create",
    "nav.group.connect": "Connect",
    "nav.group.system": "System",
    "nav.dashboard": "Home",
    "nav.assistant": "Assistant",
    "nav.search": "Search",
    "nav.projects": "Projects",
    "nav.productivity": "Tasks & productivity",
    "nav.studies": "Studies",
    "nav.journeys": "Journeys",
    "nav.packs": "Journey packs",
    "nav.creator": "Creator Studio",
    "nav.community": "Community",
    "nav.arena": "Arena",
    "nav.documents": "Documents",
    "nav.finance": "Finance",
    "nav.translate": "Translate",
    "nav.settings": "Settings",
    "nav.premium": "Premium",
    "settings.language": "Language",
    "settings.languageHelp": "Choose the language used by the NEXORA interface.",
    "language.system": "System",
    "language.device": "Device language",
    "language.portuguese": "Português (Brasil)",
    "language.english": "English",
    "language.resolved": "System — {language}",
  },
  "pt-BR": {
    "common.retry": "Tentar novamente",
    "common.loading": "Carregando…",
    "common.noData": "Ainda não há dados",
    "shell.commandCenter": "Central de comando",
    "shell.search": "Buscar ou perguntar à NEXORA…",
    "shell.searchLabel": "Abrir busca do espaço de trabalho",
    "shell.accountMenu": "Menu da conta",
    "shell.profileSettings": "Perfil e configurações",
    "shell.signOut": "Sair",
    "shell.more": "Mais",
    "shell.moreLabel": "Abrir mais módulos",
    "shell.collapse": "Recolher barra lateral",
    "shell.expand": "Expandir barra lateral",
    "shell.profileError": "Não foi possível carregar seu perfil",
    "shell.profileErrorHelp":
      "Verifique sua conexão e tente novamente. Seus dados continuam seguros.",
    "shell.signOutError": "Não foi possível sair. Verifique sua conexão e tente novamente.",
    "nav.group.command": "Comando",
    "nav.group.execute": "Executar",
    "nav.group.learn": "Aprender",
    "nav.group.create": "Criar",
    "nav.group.connect": "Conectar",
    "nav.group.system": "Sistema",
    "nav.dashboard": "Início",
    "nav.assistant": "Assistente",
    "nav.search": "Buscar",
    "nav.projects": "Projetos",
    "nav.productivity": "Tarefas e produtividade",
    "nav.studies": "Estudos",
    "nav.journeys": "Jornadas",
    "nav.packs": "Pacotes de jornadas",
    "nav.creator": "Estúdio do Criador",
    "nav.community": "Comunidade",
    "nav.arena": "Arena",
    "nav.documents": "Documentos",
    "nav.finance": "Finanças",
    "nav.translate": "Traduzir",
    "nav.settings": "Configurações",
    "nav.premium": "Premium",
    "settings.language": "Idioma",
    "settings.languageHelp": "Escolha o idioma usado pela interface da NEXORA.",
    "language.system": "Sistema",
    "language.device": "Idioma do dispositivo",
    "language.portuguese": "Português (Brasil)",
    "language.english": "English",
    "language.resolved": "Sistema — {language}",
  },
} as const;

export type TranslationKey = keyof (typeof messages)["en"];

export function resolveLocale(
  preference: LanguagePreference,
  browserLocales?: readonly string[],
): ResolvedLocale {
  if (preference !== "system") return preference;
  const locales = browserLocales?.length ? browserLocales : ["en"];
  return locales.some(
    (locale) => locale.toLowerCase() === "pt" || locale.toLowerCase().startsWith("pt-"),
  )
    ? "pt-BR"
    : "en";
}

export function translate(
  locale: ResolvedLocale,
  key: TranslationKey,
  params?: Record<string, string | number>,
) {
  let value: string = messages[locale][key];
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}
