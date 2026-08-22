export type AuthErrorCategory =
  | "VALIDATION" | "INVALID_CREDENTIALS" | "EMAIL_NOT_CONFIRMED"
  | "AUTH_PROVIDER" | "AUTH_CANCELLED" | "CALLBACK" | "NETWORK"
  | "RATE_LIMIT" | "SESSION" | "PROFILE" | "CONFIGURATION" | "UNKNOWN";

export type PresentedAuthError = { category: AuthErrorCategory; message: string };

export function presentAuthError(error: unknown, fallback: AuthErrorCategory = "UNKNOWN"): PresentedAuthError {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const value = raw.toLowerCase();
  if (value.includes("invalid login") || value.includes("invalid credentials"))
    return { category: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos. Confira os dados e tente novamente." };
  if (value.includes("email not confirmed"))
    return { category: "EMAIL_NOT_CONFIRMED", message: "Confirme seu e-mail antes de entrar." };
  if (value.includes("rate limit") || value.includes("too many"))
    return { category: "RATE_LIMIT", message: "Muitas tentativas. Aguarde um pouco e tente novamente." };
  if (value.includes("network") || value.includes("fetch") || value.includes("timeout"))
    return { category: "NETWORK", message: "Sem conexão com a NEXORA. Verifique sua internet e tente novamente." };
  if (value.includes("cancel"))
    return { category: "AUTH_CANCELLED", message: "A entrada com Google foi cancelada." };
  const messages: Record<AuthErrorCategory, string> = {
    VALIDATION: "Revise os dados informados.", INVALID_CREDENTIALS: "Não foi possível entrar.",
    EMAIL_NOT_CONFIRMED: "Confirme seu e-mail antes de entrar.", AUTH_PROVIDER: "Não foi possível entrar com Google. Tente novamente.",
    AUTH_CANCELLED: "A autenticação foi cancelada.", CALLBACK: "Não foi possível concluir a autenticação. Tente entrar novamente.",
    NETWORK: "Verifique sua conexão e tente novamente.", RATE_LIMIT: "Muitas tentativas. Aguarde e tente novamente.",
    SESSION: "Sua sessão não pôde ser validada. Entre novamente.", PROFILE: "Não foi possível preparar seu perfil.",
    CONFIGURATION: "A autenticação está temporariamente indisponível.", UNKNOWN: "Não foi possível concluir. Tente novamente.",
  };
  return { category: fallback, message: messages[fallback] };
}
