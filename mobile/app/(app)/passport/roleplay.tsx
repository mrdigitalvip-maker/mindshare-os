import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useFinishPassportRoleplaySession,
  usePassportHome,
  usePassportRoleplaySessions,
  useSendPassportRoleplayMessage,
  useStartPassportRoleplay,
} from "@/hooks/use-passport";
import type { PassportRoleplayScenario, PassportRoleplaySession } from "@/lib/passport";
import { colors, radius, spacing, typography } from "@/lib/theme";
import type { PassportRoleplayEntry } from "@/services/passport-roleplay-service";
import { useLanguage } from "@/providers/language-provider";

const scenarioOrder: PassportRoleplayScenario[] = [
  "airport",
  "hotel",
  "restaurant",
  "transport",
  "directions",
  "emergency",
  "shopping",
  "social",
];

const copy = {
  "pt-BR": {
    title: "Role-play do Passport",
    subtitle: "Pratique situações reais com a IA no seu idioma e nível atuais.",
    loading: "Preparando o Role-play…",
    errorTitle: "Não foi possível carregar suas sessões.",
    errorBody: "Nenhuma conversa foi alterada. Verifique a conexão e tente novamente.",
    retry: "Tentar novamente",
    back: "Voltar ao Passport",
    noProfileTitle: "Configure seu Passport primeiro",
    noProfileBody: "O Role-play precisa de um perfil Passport com idioma principal.",
    configure: "Configurar Passport",
    system: "REAL-WORLD LANGUAGE PRACTICE",
    choose: "Escolha um cenário",
    chooseBody: "A KIVRYN adapta a conversa ao idioma e ao nível registrados no seu Passport.",
    textMode: "Modo texto",
    liveDataNotice: "Treino de idioma: a IA não fornece preços, reservas, horários ou disponibilidade ao vivo.",
    airport: "Aeroporto",
    airportBody: "Check-in, segurança, portão e imigração.",
    hotel: "Hotel",
    hotelBody: "Recepção, check-in e pedidos durante a estadia.",
    restaurant: "Restaurante",
    restaurantBody: "Mesa, cardápio, pedidos e dúvidas.",
    transport: "Transporte",
    transportBody: "Táxi, metrô, ônibus e deslocamentos.",
    directions: "Direções",
    directionsBody: "Perguntar e entender como chegar a um lugar.",
    emergency: "Emergência",
    emergencyBody: "Comunicar um problema e pedir ajuda com clareza.",
    shopping: "Compras",
    shoppingBody: "Tamanhos, produtos, trocas e atendimento.",
    social: "Social",
    socialBody: "Apresentações e conversa cotidiana.",
    start: "Iniciar prática",
    starting: "Criando sessão…",
    startError: "Não foi possível iniciar esta prática. Tente novamente.",
    recent: "SESSÕES RECENTES",
    active: "Ativa",
    completed: "Concluída",
    resume: "Retomar",
    review: "Ver conversa",
    noSessions: "Nenhuma sessão ainda. Escolha um cenário para começar.",
    conversation: "ROLE-PLAY ATIVO",
    aiCoach: "KIVRYN COACH",
    you: "VOCÊ",
    emptyChat: "Envie sua primeira mensagem para iniciar a situação.",
    emptyChatHint: "Fale como você falaria naquela situação real. A IA responderá principalmente no idioma que você está estudando.",
    messagePlaceholder: "Digite sua resposta…",
    send: "Enviar",
    sending: "KIVRYN está respondendo…",
    sendError: "A mensagem não pôde ser enviada. Seu texto continua aqui para tentar novamente.",
    finish: "Encerrar sessão",
    finishing: "Encerrando…",
    finishError: "Não foi possível encerrar a sessão. A conversa permanece salva.",
    finishedTitle: "Sessão encerrada",
    finishedBody: "O transcript desta prática permanece salvo no seu Passport.",
    backToScenarios: "Voltar aos cenários",
    characters: "caracteres restantes",
  },
  en: {
    title: "Passport role-play",
    subtitle: "Practice real situations with AI at your current language and level.",
    loading: "Preparing Role-play…",
    errorTitle: "Your sessions could not be loaded.",
    errorBody: "No conversation was changed. Check the connection and try again.",
    retry: "Try again",
    back: "Back to Passport",
    noProfileTitle: "Set up your Passport first",
    noProfileBody: "Role-play needs a Passport profile with a primary language.",
    configure: "Set up Passport",
    system: "REAL-WORLD LANGUAGE PRACTICE",
    choose: "Choose a scenario",
    chooseBody: "KIVRYN adapts the conversation to the language and level saved in your Passport.",
    textMode: "Text mode",
    liveDataNotice: "Language practice only: AI does not provide live prices, bookings, schedules or availability.",
    airport: "Airport",
    airportBody: "Check-in, security, gate and immigration.",
    hotel: "Hotel",
    hotelBody: "Front desk, check-in and requests during your stay.",
    restaurant: "Restaurant",
    restaurantBody: "Table, menu, ordering and questions.",
    transport: "Transport",
    transportBody: "Taxi, subway, bus and getting around.",
    directions: "Directions",
    directionsBody: "Ask for and understand how to reach a place.",
    emergency: "Emergency",
    emergencyBody: "Explain a problem and ask for help clearly.",
    shopping: "Shopping",
    shoppingBody: "Sizes, products, exchanges and assistance.",
    social: "Social",
    socialBody: "Introductions and everyday conversation.",
    start: "Start practice",
    starting: "Creating session…",
    startError: "This practice could not be started. Try again.",
    recent: "RECENT SESSIONS",
    active: "Active",
    completed: "Completed",
    resume: "Resume",
    review: "View conversation",
    noSessions: "No sessions yet. Choose a scenario to begin.",
    conversation: "ACTIVE ROLE-PLAY",
    aiCoach: "KIVRYN COACH",
    you: "YOU",
    emptyChat: "Send your first message to begin the situation.",
    emptyChatHint: "Speak as you would in the real situation. AI will reply mainly in the language you are learning.",
    messagePlaceholder: "Type your response…",
    send: "Send",
    sending: "KIVRYN is responding…",
    sendError: "The message could not be sent. Your text is still here so you can retry.",
    finish: "End session",
    finishing: "Ending…",
    finishError: "The session could not be ended. The conversation remains saved.",
    finishedTitle: "Session ended",
    finishedBody: "The transcript from this practice remains saved in your Passport.",
    backToScenarios: "Back to scenarios",
    characters: "characters remaining",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTranscript(value: unknown): PassportRoleplayEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" as const : "user" as const,
      content: typeof entry.content === "string" ? entry.content : "",
      createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
    }))
    .filter((entry) => entry.content.trim().length > 0);
}

export default function PassportRoleplayScreen() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);
  const profile = passport.data?.profile ?? null;
  const sessions = usePassportRoleplaySessions(profile?.trackId ?? "", 10);
  const startSession = useStartPassportRoleplay(profile?.trackId ?? "");
  const sendMessage = useSendPassportRoleplayMessage();
  const finishSession = useFinishPassportRoleplaySession();

  const [selectedScenario, setSelectedScenario] = useState<PassportRoleplayScenario | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [finished, setFinished] = useState(false);

  if (passport.isPending) return <LoadingState title={text.loading} />;
  if (passport.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void passport.refetch()}
      />
    );
  }

  if (!profile) {
    return (
      <AppScreen scroll contentContainerStyle={styles.page}>
        <StandardHeader title={text.title} subtitle={text.subtitle} />
        <StateCard title={text.noProfileTitle} body={text.noProfileBody}>
          <PrimaryButton label={text.configure} onPress={() => router.replace("/passport/setup")} />
        </StateCard>
      </AppScreen>
    );
  }

  if (sessions.isPending) return <LoadingState title={text.loading} />;
  if (sessions.isError) {
    return (
      <ErrorState
        title={text.errorTitle}
        message={text.errorBody}
        actionLabel={text.retry}
        onAction={() => void sessions.refetch()}
      />
    );
  }

  const allSessions = sessions.data ?? [];
  const selectedFromQuery = selectedSessionId
    ? allSessions.find((session) => session.id === selectedSessionId) ?? null
    : null;
  const selectedFromStart =
    selectedSessionId && startSession.data?.id === selectedSessionId ? startSession.data : null;
  const currentSession = selectedFromQuery ?? selectedFromStart;
  const sentTranscript =
    selectedSessionId && sendMessage.data?.sessionId === selectedSessionId
      ? sendMessage.data.transcript
      : null;
  const transcript = sentTranscript ?? normalizeTranscript(currentSession?.transcript);
  const currentScenario = currentSession?.scenario ?? selectedScenario;
  const canSend =
    Boolean(currentSession && currentSession.status === "active") &&
    draft.trim().length > 0 &&
    draft.trim().length <= 1200 &&
    !sendMessage.isPending &&
    !finishSession.isPending;

  async function handleStart() {
    if (!selectedScenario || startSession.isPending) return;
    try {
      const session = await startSession.mutateAsync(selectedScenario);
      setSelectedSessionId(session.id);
      setDraft("");
      setFinished(false);
      sendMessage.reset();
      finishSession.reset();
    } catch {
      // Mutation state renders the error while preserving the selected scenario.
    }
  }

  function openSession(session: PassportRoleplaySession) {
    setSelectedSessionId(session.id);
    setSelectedScenario(session.scenario);
    setDraft("");
    setFinished(session.status === "completed");
    sendMessage.reset();
    finishSession.reset();
  }

  async function handleSend() {
    if (!currentSession || !canSend) return;
    const message = draft.trim();
    try {
      await sendMessage.mutateAsync({ sessionId: currentSession.id, message });
      setDraft("");
    } catch {
      // Keep the draft so the user can retry the exact message.
    }
  }

  async function handleFinish() {
    if (!currentSession || currentSession.status !== "active" || finishSession.isPending) return;
    try {
      await finishSession.mutateAsync(currentSession.id);
      setFinished(true);
    } catch {
      // Mutation state displays the error while preserving the conversation.
    }
  }

  function backToScenarios() {
    setSelectedSessionId(null);
    setSelectedScenario(null);
    setDraft("");
    setFinished(false);
    startSession.reset();
    sendMessage.reset();
    finishSession.reset();
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={text.title} subtitle={text.subtitle} />

      <Pressable accessibilityRole="button" onPress={() => router.replace("/passport")} style={styles.backButton}>
        <Text style={styles.backText}>‹ {text.back}</Text>
      </Pressable>

      {currentSession ? (
        <View style={styles.workspace}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionHeaderText}>
              <Text style={styles.eyebrow}>{text.conversation}</Text>
              <Text style={styles.sessionTitle}>
                {currentScenario ? scenarioTitle(currentScenario, text) : text.title}
              </Text>
              <Text style={styles.sessionMeta}>
                {text.textMode} · {currentSession.status === "active" ? text.active : text.completed}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={backToScenarios} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>{text.backToScenarios}</Text>
            </Pressable>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{text.liveDataNotice}</Text>
          </View>

          <View style={styles.chatStack}>
            {transcript.length ? (
              transcript.map((entry, index) => (
                <MessageBubble key={`${entry.createdAt}-${index}`} entry={entry} text={text} />
              ))
            ) : (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatTitle}>{text.emptyChat}</Text>
                <Text style={styles.emptyChatBody}>{text.emptyChatHint}</Text>
              </View>
            )}
          </View>

          {finished || currentSession.status === "completed" ? (
            <View style={styles.finishedCard} accessibilityLiveRegion="polite">
              <Text style={styles.finishedTitle}>{text.finishedTitle}</Text>
              <Text style={styles.finishedBody}>{text.finishedBody}</Text>
              <PrimaryButton label={text.backToScenarios} onPress={backToScenarios} />
            </View>
          ) : (
            <View style={styles.composerCard}>
              <TextInput
                value={draft}
                onChangeText={(value) => {
                  setDraft(value);
                  sendMessage.reset();
                }}
                multiline
                maxLength={1200}
                placeholder={text.messagePlaceholder}
                placeholderTextColor={colors.textMuted}
                textAlignVertical="top"
                style={styles.input}
              />
              <View style={styles.composerFooter}>
                <Text style={styles.charCount}>{1200 - draft.length} {text.characters}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSend }}
                  disabled={!canSend}
                  onPress={() => void handleSend()}
                  style={({ pressed }) => [
                    styles.sendButton,
                    !canSend && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.sendButtonText}>{sendMessage.isPending ? text.sending : text.send}</Text>
                </Pressable>
              </View>

              {sendMessage.isError ? (
                <View style={styles.errorCard} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{text.sendError}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={finishSession.isPending || sendMessage.isPending}
                onPress={() => void handleFinish()}
                style={({ pressed }) => [
                  styles.finishButton,
                  (finishSession.isPending || sendMessage.isPending) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.finishButtonText}>
                  {finishSession.isPending ? text.finishing : text.finish}
                </Text>
              </Pressable>

              {finishSession.isError ? (
                <View style={styles.errorCard} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{text.finishError}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{text.system}</Text>
            <Text style={styles.heroTitle}>{text.choose}</Text>
            <Text style={styles.heroBody}>{text.chooseBody}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>{text.textMode}</Text>
            </View>
            <Text style={styles.noticeInline}>{text.liveDataNotice}</Text>
          </View>

          <View style={styles.scenarioGrid}>
            {scenarioOrder.map((scenario) => {
              const selected = selectedScenario === scenario;
              return (
                <Pressable
                  key={scenario}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSelectedScenario(scenario);
                    startSession.reset();
                  }}
                  style={({ pressed }) => [
                    styles.scenarioCard,
                    selected && styles.scenarioSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.scenarioTitle}>{scenarioTitle(scenario, text)}</Text>
                  <Text style={styles.scenarioBody}>{scenarioBody(scenario, text)}</Text>
                </Pressable>
              );
            })}
          </View>

          {startSession.isError ? (
            <View style={styles.errorCard} accessibilityLiveRegion="polite">
              <Text style={styles.errorText}>{text.startError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedScenario || startSession.isPending }}
            disabled={!selectedScenario || startSession.isPending}
            onPress={() => void handleStart()}
            style={({ pressed }) => [
              styles.primaryStart,
              (!selectedScenario || startSession.isPending) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryStartText}>{startSession.isPending ? text.starting : text.start}</Text>
          </Pressable>

          <View style={styles.recentSection}>
            <Text style={styles.recentLabel}>{text.recent}</Text>
            {allSessions.length ? (
              allSessions.map((session) => (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  onPress={() => openSession(session)}
                  style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
                >
                  <View style={styles.sessionCardCopy}>
                    <Text style={styles.sessionCardTitle}>{scenarioTitle(session.scenario, text)}</Text>
                    <Text style={styles.sessionCardMeta}>
                      {session.status === "active" ? text.active : text.completed} · {normalizeTranscript(session.transcript).length} msgs
                    </Text>
                  </View>
                  <Text style={styles.sessionAction}>{session.status === "active" ? text.resume : text.review} →</Text>
                </Pressable>
              ))
            ) : (
              <View style={styles.noSessionsCard}>
                <Text style={styles.noSessionsText}>{text.noSessions}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </AppScreen>
  );
}

function scenarioTitle(scenario: PassportRoleplayScenario, text: (typeof copy)[keyof typeof copy]) {
  switch (scenario) {
    case "airport": return text.airport;
    case "hotel": return text.hotel;
    case "restaurant": return text.restaurant;
    case "transport": return text.transport;
    case "directions": return text.directions;
    case "emergency": return text.emergency;
    case "shopping": return text.shopping;
    case "social": return text.social;
    default: return scenario;
  }
}

function scenarioBody(scenario: PassportRoleplayScenario, text: (typeof copy)[keyof typeof copy]) {
  switch (scenario) {
    case "airport": return text.airportBody;
    case "hotel": return text.hotelBody;
    case "restaurant": return text.restaurantBody;
    case "transport": return text.transportBody;
    case "directions": return text.directionsBody;
    case "emergency": return text.emergencyBody;
    case "shopping": return text.shoppingBody;
    case "social": return text.socialBody;
    default: return "";
  }
}

function MessageBubble({
  entry,
  text,
}: {
  entry: PassportRoleplayEntry;
  text: (typeof copy)[keyof typeof copy];
}) {
  const assistant = entry.role === "assistant";
  return (
    <View style={[styles.messageRow, assistant ? styles.messageRowAssistant : styles.messageRowUser]}>
      <View style={[styles.messageBubble, assistant ? styles.assistantBubble : styles.userBubble]}>
        <Text style={styles.messageLabel}>{assistant ? text.aiCoach : text.you}</Text>
        <Text style={styles.messageText}>{entry.content}</Text>
      </View>
    </View>
  );
}

function StateCard({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryStart, pressed && styles.pressed]}>
      <Text style={styles.primaryStartText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl },
  backButton: { alignSelf: "flex-start", marginTop: spacing.md, paddingVertical: spacing.sm },
  backText: { ...typography.label, color: colors.textSecondary },
  hero: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  heroTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  heroBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  modeBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBadgeText: { ...typography.caption, color: colors.primaryBright },
  noticeInline: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  scenarioGrid: { gap: spacing.sm, marginTop: spacing.md },
  scenarioCard: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scenarioSelected: { borderColor: colors.primaryBright, backgroundColor: colors.canvasElevated },
  scenarioTitle: { ...typography.heading, color: colors.text },
  scenarioBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  primaryStart: {
    minHeight: 54,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  primaryStartText: { ...typography.label, color: colors.text },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger },
  recentSection: { marginTop: spacing.xl, gap: spacing.sm },
  recentLabel: { ...typography.eyebrow, color: colors.primaryBright },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sessionCardCopy: { flex: 1 },
  sessionCardTitle: { ...typography.heading, color: colors.text },
  sessionCardMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  sessionAction: { ...typography.label, color: colors.primaryBright },
  noSessionsCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  noSessionsText: { ...typography.body, color: colors.textSecondary },
  workspace: { marginTop: spacing.sm },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  sessionHeaderText: { flex: 1 },
  sessionTitle: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  sessionMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  smallButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  smallButtonText: { ...typography.caption, color: colors.textSecondary },
  noticeCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  noticeText: { ...typography.caption, color: colors.textMuted },
  chatStack: { gap: spacing.sm, marginTop: spacing.md },
  emptyChat: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyChatTitle: { ...typography.heading, color: colors.text },
  emptyChatBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  messageRow: { flexDirection: "row" },
  messageRowAssistant: { justifyContent: "flex-start" },
  messageRowUser: { justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "88%",
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  assistantBubble: { backgroundColor: colors.surface, borderColor: colors.border },
  userBubble: { backgroundColor: colors.canvasElevated, borderColor: colors.borderActive },
  messageLabel: { ...typography.caption, color: colors.primaryBright },
  messageText: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  composerCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    minHeight: 110,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    ...typography.body,
    color: colors.text,
  },
  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  charCount: { ...typography.caption, color: colors.textMuted, flex: 1 },
  sendButton: {
    minHeight: 44,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  sendButtonText: { ...typography.label, color: colors.text },
  finishButton: {
    minHeight: 48,
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvasElevated,
  },
  finishButtonText: { ...typography.label, color: colors.textSecondary },
  finishedCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.canvasElevated,
  },
  finishedTitle: { ...typography.heading, color: colors.text },
  finishedBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  stateCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stateTitle: { ...typography.heading, color: colors.text },
  stateBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});
