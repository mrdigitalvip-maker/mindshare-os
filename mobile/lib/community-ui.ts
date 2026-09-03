import type { CommunityMessage } from "@/lib/community";

export const COMMUNITY_USERNAME = /^[a-z][a-z0-9_]{2,29}$/;

export const normalizeCommunityUsername = (value: string) =>
  value.trim().replace(/^@+/, "").toLocaleLowerCase("pt-BR");

export function normalizeCommunityProfile<
  T extends {
    displayName: string | null;
    username: string | null;
    bio: string | null;
  },
>(profile: T): T {
  return {
    ...profile,
    displayName: profile.displayName?.trim() || null,
    username: normalizeCommunityUsername(profile.username ?? "") || null,
    bio: profile.bio?.trim() || null,
  };
}

export function profileValidation(displayName: string, username: string, isVisible: boolean) {
  if (displayName.trim().length > 60) return "O nome público deve ter até 60 caracteres.";
  if (username && !COMMUNITY_USERNAME.test(username))
    return "Use 3 a 30 caracteres: comece com letra e use apenas letras, números ou _.";
  if (isVisible && !displayName.trim())
    return "Informe um nome público para aparecer na Community.";
  if (isVisible && !COMMUNITY_USERNAME.test(username)) return "Informe um @username válido.";
  return null;
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

const dayKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export function formatMessageDate(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);
  if (difference === 0) return "Hoje";
  if (difference === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" as const }),
  }).format(date);
}

export function withDateSeparators(messages: CommunityMessage[]) {
  return messages.flatMap((message, index) => {
    const previous = messages[index - 1];
    return !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt)
      ? [
          {
            kind: "date" as const,
            id: `date:${dayKey(message.createdAt)}`,
            createdAt: message.createdAt,
          },
          { kind: "message" as const, id: message.id, message },
        ]
      : [{ kind: "message" as const, id: message.id, message }];
  });
}

export function messageActions(message: CommunityMessage) {
  return {
    canReply: !message.removed,
    canCopy: !message.removed,
    canReport: !message.removed && message.actorType === "user" && !message.isSelf,
    canBlock:
      !message.removed &&
      message.actorType === "user" &&
      !message.isSelf &&
      Boolean(message.senderPublicId),
  };
}

/** Copies only visible message text and keeps unavailable native support non-fatal. */
export async function copyCommunityText(
  value: string,
  removed: boolean,
  clipboard: { setStringAsync?: (text: string) => Promise<void> } | null | undefined,
) {
  if (removed || !clipboard?.setStringAsync) return false;
  try {
    await clipboard.setStringAsync(value);
    return true;
  } catch {
    return false;
  }
}
