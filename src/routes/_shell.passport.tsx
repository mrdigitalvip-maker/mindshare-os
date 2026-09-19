import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { WorkspaceProgress, WorkspaceShell } from "@/components/workspace-ui";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";
import { transcribeVoiceAudio } from "@/services/voice-provider";
import {
  addWebPassportVocabulary,
  completeWebPassportLesson,
  finishWebRoleplay,
  getWebPassportProfile,
  getWebPassportRetentionSummary,
  listWebDueVocabulary,
  listWebPassportLessons,
  listWebPassportMissions,
  listWebPassportTracks,
  listWebPlacementQuestions,
  listWebRoleplaySessions,
  reviewWebVocabulary,
  saveWebPassportProfile,
  sendWebRoleplayMessage,
  startWebRoleplay,
  submitWebPlacement,
  updateWebPassportMission,
  type WebPassportProfile,
} from "@/services/passport-web-service";
import "@/passport-learning-studio.css";

export const Route = createFileRoute("/_shell/passport")({ component: PassportWorkspace });

const passportKeys = {
  tracks: ["web-passport", "tracks"] as const,
  profile: (userId: string) => ["web-passport", "profile", userId] as const,
  lessons: (userId: string, trackId: string) => ["web-passport", "lessons", userId, trackId] as const,
  placement: (userId: string, trackId: string) => ["web-passport", "placement", userId, trackId] as const,
  vocabulary: (userId: string, trackId: string) => ["web-passport", "vocabulary", userId, trackId] as const,
  missions: (userId: string, trackId: string) => ["web-passport", "missions", userId, trackId] as const,
  roleplay: (userId: string, trackId: string) => ["web-passport", "roleplay", userId, trackId] as const,
  retention: (userId: string, trackId: string) => ["web-passport", "retention", userId, trackId] as const,
};

const copy = {
  "pt-BR": {
    title: "KIVRYN Passport",
    description: "Seu estúdio internacional para aprender, praticar e chegar pronto — sincronizado com o app.",
    setup: "Configurar Passport",
    setupBody: "Escolha idioma, objetivo e ritmo. Essas preferências são salvas no mesmo perfil usado no Android.",
    language: "Idioma",
    goal: "Objetivo",
    minutes: "Minutos por dia",
    horizon: "Horizonte do plano",
    save: "Criar Passport",
    saving: "Salvando…",
    travel: "Viagem",
    work: "Trabalho",
    study: "Estudos",
    conversation: "Conversação",
    culture: "Cultura",
    placement: "Teste de nível",
    placementBody: "Responda às perguntas e envie. O resultado é calculado no servidor; respostas corretas não são expostas ao cliente.",
    submitPlacement: "Calcular meu nível",
    placementPending: "Responda todas as perguntas para enviar.",
    level: "Nível",
    progress: "Progresso das lições",
    lessons: "Lições",
    minutesShort: "min",
    completed: "Concluída",
    complete: "Concluir lição",
    currentLesson: "LIÇÃO ATUAL",
    guide: "KIVI · PASSPORT GUIDE",
    guideReady: "Uma etapa por vez. Eu acompanho seu progresso e preparo o próximo passo.",
    noLesson: "Você concluiu todas as lições disponíveis.",
    internationalContext: "CONTEXTO INTERNACIONAL",
    route: "SUA ROTA",
    routeBody: "Do aprendizado guiado até situações reais no mundo.",
    routeStart: "Base",
    routePractice: "Prática",
    routeReal: "Situações reais",
    routeReady: "Pronto para ir",
    listening: "Listening",
    listen: "Ouvir exemplo",
    repeat: "Repetir e comparar",
    stopRecording: "Parar gravação",
    transcribing: "Transcrevendo sua fala…",
    heard: "A KIVRYN ouviu",
    textMatch: "Correspondência de texto",
    pronunciationNote: "A comparação usa somente a transcrição reconhecida. Não é uma nota de sotaque ou pronúncia.",
    noListening: "Nenhum exemplo de áudio disponível na próxima lição.",
    vocabulary: "Vocabulário para revisar",
    noVocabulary: "Tudo revisado por enquanto.",
    addVocabulary: "Adicionar vocabulário",
    termPlaceholder: "Termo (ex.: boarding pass)",
    translationPlaceholder: "Tradução",
    contextPlaceholder: "Contexto opcional",
    saveWord: "Salvar palavra",
    savingWord: "Salvando…",
    again: "Novamente",
    hard: "Difícil",
    good: "Bom",
    easy: "Fácil",
    missions: "Missões de hoje",
    noMissions: "Nenhuma missão persistida para hoje.",
    finishMission: "Concluir",
    skipMission: "Pular",
    roleplay: "Role-play com IA",
    roleplayBody: "Pratique situações reais. Não são fornecidos preços, horários, reservas ou disponibilidade ao vivo.",
    scenario: "Cenário",
    startRoleplay: "Iniciar prática",
    message: "Digite sua resposta…",
    send: "Enviar",
    end: "Encerrar sessão",
    noMessages: "Envie a primeira mensagem para iniciar a situação.",
    airport: "Aeroporto",
    hotel: "Hotel",
    restaurant: "Restaurante",
    transport: "Transporte",
    directions: "Direções",
    emergency: "Emergência",
    shopping: "Compras",
    social: "Social",
    retry: "Tentar novamente",
    streak: "Sequência",
    streakDays: "dias",
    activeWeek: "Atividade em 7 dias",
    todayActive: "Hoje ativo",
    todayPending: "Faça uma prática hoje",
    longestStreak: "Melhor sequência",
  },
  en: {
    title: "KIVRYN Passport",
    description: "Your international studio to learn, practice and arrive ready — synchronized with the app.",
    setup: "Set up Passport",
    setupBody: "Choose a language, goal and pace. These preferences are saved to the same profile used on Android.",
    language: "Language",
    goal: "Goal",
    minutes: "Minutes per day",
    horizon: "Plan horizon",
    save: "Create Passport",
    saving: "Saving…",
    travel: "Travel",
    work: "Work",
    study: "Study",
    conversation: "Conversation",
    culture: "Culture",
    placement: "Placement test",
    placementBody: "Answer the questions and submit. The result is calculated on the server; correct answers are never exposed to the client.",
    submitPlacement: "Calculate my level",
    placementPending: "Answer every question before submitting.",
    level: "Level",
    progress: "Lesson progress",
    lessons: "Lessons",
    minutesShort: "min",
    completed: "Completed",
    complete: "Complete lesson",
    currentLesson: "CURRENT LESSON",
    guide: "KIVI · PASSPORT GUIDE",
    guideReady: "One step at a time. I track your progress and prepare the next move.",
    noLesson: "You completed every lesson currently available.",
    internationalContext: "INTERNATIONAL CONTEXT",
    route: "YOUR ROUTE",
    routeBody: "From guided learning to real-world situations.",
    routeStart: "Base",
    routePractice: "Practice",
    routeReal: "Real situations",
    routeReady: "Ready to go",
    listening: "Listening",
    listen: "Play example",
    repeat: "Repeat and compare",
    stopRecording: "Stop recording",
    transcribing: "Transcribing your speech…",
    heard: "KIVRYN heard",
    textMatch: "Text match",
    pronunciationNote: "The comparison uses recognized transcription only. It is not an accent or pronunciation score.",
    noListening: "No listening example is available in the next lesson.",
    vocabulary: "Vocabulary to review",
    noVocabulary: "You're all caught up for now.",
    addVocabulary: "Add vocabulary",
    termPlaceholder: "Term (e.g. boarding pass)",
    translationPlaceholder: "Translation",
    contextPlaceholder: "Optional context",
    saveWord: "Save word",
    savingWord: "Saving…",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    missions: "Today's missions",
    noMissions: "No persisted missions for today.",
    finishMission: "Complete",
    skipMission: "Skip",
    roleplay: "AI role-play",
    roleplayBody: "Practice real situations. No live prices, schedules, bookings or availability are provided.",
    scenario: "Scenario",
    startRoleplay: "Start practice",
    message: "Type your response…",
    send: "Send",
    end: "End session",
    noMessages: "Send the first message to begin the situation.",
    airport: "Airport",
    hotel: "Hotel",
    restaurant: "Restaurant",
    transport: "Transport",
    directions: "Directions",
    emergency: "Emergency",
    shopping: "Shopping",
    social: "Social",
    retry: "Try again",
    streak: "Streak",
    streakDays: "days",
    activeWeek: "Activity in 7 days",
    todayActive: "Active today",
    todayPending: "Practice today",
    longestStreak: "Best streak",
  },
} as const;

type Goal = WebPassportProfile["goal"];
const scenarios = ["airport", "hotel", "restaurant", "transport", "directions", "emergency", "shopping", "social"] as const;
type Track = Awaited<ReturnType<typeof listWebPassportTracks>>[number];

function destinationsForTrack(track?: Track) {
  const value = `${track?.slug ?? ""} ${track?.title ?? ""}`.toLowerCase();
  if (value.includes("span") || value.includes("espan") || value.includes("españ")) {
    return [
      { flag: "🇪🇸", label: "España" },
      { flag: "🇲🇽", label: "México" },
      { flag: "🇦🇷", label: "Argentina" },
    ];
  }
  if (value.includes("fran") || value.includes("french")) {
    return [
      { flag: "🇫🇷", label: "France" },
      { flag: "🇨🇦", label: "Canada" },
      { flag: "🇧🇪", label: "Belgique" },
    ];
  }
  if (value.includes("portugu")) {
    return [
      { flag: "🇧🇷", label: "Brasil" },
      { flag: "🇵🇹", label: "Portugal" },
      { flag: "🇦🇴", label: "Angola" },
    ];
  }
  return [
    { flag: "🇺🇸", label: "USA" },
    { flag: "🇬🇧", label: "UK" },
    { flag: "🇨🇦", label: "Canada" },
  ];
}

function normalizedWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function textMatchPercent(expected: string, heard: string) {
  const target = normalizedWords(expected);
  const actual = normalizedWords(heard);
  if (!target.length || !actual.length) return 0;
  const remaining = [...actual];
  let matched = 0;
  for (const word of target) {
    const index = remaining.indexOf(word);
    if (index >= 0) {
      matched += 1;
      remaining.splice(index, 1);
    }
  }
  return Math.round((matched / Math.max(target.length, actual.length)) * 100);
}

function passportSpeechLocale(track?: Track) {
  const slug = track?.slug.toLowerCase() ?? "english";
  if (slug === "spanish") return "es-ES";
  if (slug === "portuguese") return "pt-BR";
  if (slug === "french") return "fr-FR";
  return "en-US";
}

function PassportWorkspace() {
  const { user } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const tracks = useQuery({ queryKey: passportKeys.tracks, queryFn: listWebPassportTracks });
  const profile = useQuery({
    queryKey: passportKeys.profile(userId),
    queryFn: () => getWebPassportProfile(userId),
    enabled: Boolean(userId),
  });
  const trackId = profile.data?.trackId ?? "";
  const lessons = useQuery({
    queryKey: passportKeys.lessons(userId, trackId),
    queryFn: () => listWebPassportLessons(userId, trackId),
    enabled: Boolean(userId && trackId && profile.data?.placementScore != null),
  });
  const placement = useQuery({
    queryKey: passportKeys.placement(userId, trackId),
    queryFn: () => listWebPlacementQuestions(userId, trackId),
    enabled: Boolean(userId && trackId && profile.data?.placementScore == null),
  });
  const vocabulary = useQuery({
    queryKey: passportKeys.vocabulary(userId, trackId),
    queryFn: () => listWebDueVocabulary(userId, trackId),
    enabled: Boolean(userId && trackId && profile.data?.placementScore != null),
  });
  const missions = useQuery({
    queryKey: passportKeys.missions(userId, trackId),
    queryFn: () => listWebPassportMissions(userId, trackId, resolvedLocale),
    enabled: Boolean(userId && trackId && profile.data?.placementScore != null),
  });
  const roleplay = useQuery({
    queryKey: passportKeys.roleplay(userId, trackId),
    queryFn: () => listWebRoleplaySessions(userId, trackId),
    enabled: Boolean(userId && trackId && profile.data?.placementScore != null),
  });
  const retention = useQuery({
    queryKey: passportKeys.retention(userId, trackId),
    queryFn: () => getWebPassportRetentionSummary(userId, trackId),
    enabled: Boolean(userId && trackId && profile.data?.placementScore != null),
  });

  const invalidatePassport = async () => {
    await qc.invalidateQueries({ queryKey: ["web-passport"] });
  };

  const saveProfile = useMutation({
    mutationFn: (input: Parameters<typeof saveWebPassportProfile>[1]) =>
      saveWebPassportProfile(userId, input),
    onSuccess: async () => {
      await invalidatePassport();
      toast.success(resolvedLocale === "en" ? "Passport created." : "Passport criado.");
    },
    onError: () => toast.error(resolvedLocale === "en" ? "Passport could not be saved." : "Não foi possível salvar o Passport."),
  });
  const submitPlacement = useMutation({
    mutationFn: (answers: Record<string, number>) => submitWebPlacement(userId, trackId, answers),
    onSuccess: async () => {
      await invalidatePassport();
      toast.success(resolvedLocale === "en" ? "Level updated." : "Nível atualizado.");
    },
    onError: () => toast.error(resolvedLocale === "en" ? "Placement could not be submitted." : "Não foi possível enviar o teste."),
  });
  const completeLesson = useMutation({
    mutationFn: (lessonId: string) => completeWebPassportLesson(userId, lessonId),
    onSuccess: invalidatePassport,
    onError: () => toast.error(resolvedLocale === "en" ? "Lesson could not be completed." : "Não foi possível concluir a lição."),
  });
  const reviewVocabulary = useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: number }) => reviewWebVocabulary(userId, id, grade),
    onSuccess: invalidatePassport,
    onError: () => toast.error(resolvedLocale === "en" ? "Review could not be saved." : "Não foi possível salvar a revisão."),
  });
  const addVocabulary = useMutation({
    mutationFn: (input: { term: string; translation: string; context: string }) =>
      addWebPassportVocabulary(userId, trackId, input),
    onSuccess: async () => {
      await invalidatePassport();
      toast.success(resolvedLocale === "en" ? "Vocabulary saved." : "Vocabulário salvo.");
    },
    onError: () => toast.error(resolvedLocale === "en" ? "Vocabulary could not be saved." : "Não foi possível salvar o vocabulário."),
  });
  const updateMission = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "completed" | "skipped" }) =>
      updateWebPassportMission(userId, id, status),
    onSuccess: invalidatePassport,
    onError: () => toast.error(resolvedLocale === "en" ? "Mission could not be updated." : "Não foi possível atualizar a missão."),
  });
  const startRoleplay = useMutation({
    mutationFn: (scenario: string) => startWebRoleplay(userId, trackId, scenario),
    onSuccess: invalidatePassport,
    onError: () => toast.error(resolvedLocale === "en" ? "Role-play could not be started." : "Não foi possível iniciar o role-play."),
  });
  const sendRoleplay = useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      sendWebRoleplayMessage(userId, sessionId, message),
    onSuccess: invalidatePassport,
    onError: () => toast.error(resolvedLocale === "en" ? "Message could not be sent." : "Não foi possível enviar a mensagem."),
  });
  const endRoleplay = useMutation({
    mutationFn: (sessionId: string) => finishWebRoleplay(userId, sessionId),
    onSuccess: invalidatePassport,
  });

  if (!userId) return null;

  return (
    <PageShell>
      <PageHeader title={text.title} description={text.description} />
      <WorkspaceShell>
        <RouteState
          loading={tracks.isLoading || profile.isLoading}
          error={tracks.isError || profile.isError}
          empty={false}
          onRetry={() => {
            void tracks.refetch();
            void profile.refetch();
          }}
        >
          {!profile.data ? (
            <PassportSetup
              tracks={tracks.data ?? []}
              locale={resolvedLocale}
              pending={saveProfile.isPending}
              onSave={(input) => saveProfile.mutate(input)}
            />
          ) : profile.data.placementScore == null ? (
            <PlacementPanel
              locale={resolvedLocale}
              questions={placement.data ?? []}
              loading={placement.isLoading}
              error={placement.isError}
              pending={submitPlacement.isPending}
              onRetry={() => void placement.refetch()}
              onSubmit={(answers) => submitPlacement.mutate(answers)}
            />
          ) : (
            <PassportReady
              locale={resolvedLocale}
              profile={profile.data}
              track={tracks.data?.find((item) => item.id === trackId)}
              lessons={lessons.data ?? []}
              vocabulary={vocabulary.data ?? []}
              missions={missions.data ?? []}
              sessions={roleplay.data ?? []}
              retention={retention.data}
              loading={
                lessons.isLoading ||
                vocabulary.isLoading ||
                missions.isLoading ||
                roleplay.isLoading ||
                retention.isLoading
              }
              completeLesson={(id) => completeLesson.mutate(id)}
              reviewVocabulary={(id, grade) => reviewVocabulary.mutate({ id, grade })}
              addVocabulary={(term, translation, context) => addVocabulary.mutate({ term, translation, context })}
              vocabularyBusy={addVocabulary.isPending}
              updateMission={(id, status) => updateMission.mutate({ id, status })}
              startRoleplay={(scenario) => startRoleplay.mutate(scenario)}
              sendRoleplay={(sessionId, message) => sendRoleplay.mutate({ sessionId, message })}
              endRoleplay={(sessionId) => endRoleplay.mutate(sessionId)}
              roleplayBusy={startRoleplay.isPending || sendRoleplay.isPending || endRoleplay.isPending}
            />
          )}
        </RouteState>
      </WorkspaceShell>
    </PageShell>
  );
}

function PassportSetup({
  tracks,
  locale,
  pending,
  onSave,
}: {
  tracks: Awaited<ReturnType<typeof listWebPassportTracks>>;
  locale: "pt-BR" | "en";
  pending: boolean;
  onSave(input: Parameters<typeof saveWebPassportProfile>[1]): void;
}) {
  const text = copy[locale];
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [goal, setGoal] = useState<Goal>("travel");
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [planHorizonDays, setPlanHorizonDays] = useState(90);
  const goals: Goal[] = ["travel", "work", "study", "conversation", "culture"];

  return (
    <section className="v2-surface rounded-3xl p-6">
      <h2 className="text-2xl font-semibold">{text.setup}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{text.setupBody}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">{text.language}</span>
          <select className="rounded-xl border border-border bg-background px-3 py-3" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            {tracks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">{text.goal}</span>
          <select className="rounded-xl border border-border bg-background px-3 py-3" value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
            {goals.map((item) => <option key={item} value={item}>{text[item]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">{text.minutes}</span>
          <select className="rounded-xl border border-border bg-background px-3 py-3" value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))}>
            {[5, 15, 30, 45, 60].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="text-muted-foreground">{text.horizon}</span>
          <select className="rounded-xl border border-border bg-background px-3 py-3" value={planHorizonDays} onChange={(e) => setPlanHorizonDays(Number(e.target.value))}>
            {[30, 60, 90, 180, 365].map((item) => <option key={item} value={item}>{item} {locale === "en" ? "days" : "dias"}</option>)}
          </select>
        </label>
      </div>
      <Button className="mt-6" disabled={!trackId || pending} onClick={() => onSave({ trackId, goal, dailyMinutes, planHorizonDays, nativeLocale: locale })}>
        {pending ? text.saving : text.save}
      </Button>
    </section>
  );
}

function PlacementPanel({
  locale,
  questions,
  loading,
  error,
  pending,
  onRetry,
  onSubmit,
}: {
  locale: "pt-BR" | "en";
  questions: Awaited<ReturnType<typeof listWebPlacementQuestions>>;
  loading: boolean;
  error: boolean;
  pending: boolean;
  onRetry(): void;
  onSubmit(answers: Record<string, number>): void;
}) {
  const text = copy[locale];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  if (loading) return <p className="text-sm text-muted-foreground">{locale === "en" ? "Loading placement test…" : "Carregando teste de nível…"}</p>;
  if (error)
    return <div className="v2-surface rounded-2xl p-5"><p>{locale === "en" ? "The placement test could not be loaded." : "Não foi possível carregar o teste de nível."}</p><Button className="mt-4" onClick={onRetry}>{text.retry}</Button></div>;

  const complete = questions.length > 0 && questions.every((item) => Number.isInteger(answers[item.key]));
  return (
    <section className="v2-surface rounded-3xl p-6">
      <h2 className="text-2xl font-semibold">{text.placement}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{text.placementBody}</p>
      <div className="mt-6 grid gap-4">
        {questions.map((question, index) => (
          <article key={question.key} className="rounded-2xl border border-border bg-background/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{index + 1}/{questions.length} · {question.difficulty}</p>
            <h3 className="mt-2 font-medium">{question.prompt}</h3>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <button
                  key={`${question.key}-${optionIndex}`}
                  type="button"
                  onClick={() => setAnswers((current) => ({ ...current, [question.key]: optionIndex }))}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${answers[question.key] === optionIndex ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!complete ? <p className="mt-4 text-sm text-muted-foreground">{text.placementPending}</p> : null}
      <Button className="mt-5" disabled={!complete || pending} onClick={() => onSubmit(answers)}>{text.submitPlacement}</Button>
    </section>
  );
}

function PassportReady({
  locale,
  profile,
  track,
  lessons,
  vocabulary,
  missions,
  sessions,
  retention,
  loading,
  completeLesson,
  reviewVocabulary,
  addVocabulary,
  vocabularyBusy,
  updateMission,
  startRoleplay,
  sendRoleplay,
  endRoleplay,
  roleplayBusy,
}: {
  locale: "pt-BR" | "en";
  profile: NonNullable<Awaited<ReturnType<typeof getWebPassportProfile>>>;
  track?: Track;
  lessons: Awaited<ReturnType<typeof listWebPassportLessons>>;
  vocabulary: Awaited<ReturnType<typeof listWebDueVocabulary>>;
  missions: Awaited<ReturnType<typeof listWebPassportMissions>>;
  sessions: Awaited<ReturnType<typeof listWebRoleplaySessions>>;
  retention?: Awaited<ReturnType<typeof getWebPassportRetentionSummary>>;
  loading: boolean;
  completeLesson(id: string): void;
  reviewVocabulary(id: string, grade: number): void;
  addVocabulary(term: string, translation: string, context: string): void;
  vocabularyBusy: boolean;
  updateMission(id: string, status: "completed" | "skipped"): void;
  startRoleplay(scenario: string): void;
  sendRoleplay(sessionId: string, message: string): void;
  endRoleplay(sessionId: string): void;
  roleplayBusy: boolean;
}) {
  const text = copy[locale];
  const completed = lessons.filter((lesson) => lesson.status === "completed").length;
  const progress = lessons.length ? (completed / lessons.length) * 100 : 0;
  const nextLesson = lessons.find((lesson) => lesson.status !== "completed");
  const listeningText = String(nextLesson?.content.listening ?? nextLesson?.content.example ?? "").trim();
  const activeSession = sessions.find((session) => session.status === "active") ?? null;
  const [scenario, setScenario] = useState<(typeof scenarios)[number]>("airport");
  const [message, setMessage] = useState("");
  const [vocabularyTerm, setVocabularyTerm] = useState("");
  const [vocabularyTranslation, setVocabularyTranslation] = useState("");
  const [vocabularyContext, setVocabularyContext] = useState("");
  const [listeningRecording, setListeningRecording] = useState(false);
  const [listeningTranscribing, setListeningTranscribing] = useState(false);
  const [listeningTranscript, setListeningTranscript] = useState("");
  const [listeningMatch, setListeningMatch] = useState<number | null>(null);
  const listeningRecorderRef = useRef<MediaRecorder | null>(null);
  const listeningStreamRef = useRef<MediaStream | null>(null);
  const listeningChunksRef = useRef<Blob[]>([]);
  const listeningTimerRef = useRef<number | null>(null);
  const destinations = useMemo(() => destinationsForTrack(track), [track?.slug, track?.title]);
  const routeStages = [text.routeStart, text.routePractice, text.routeReal, text.routeReady];
  const studioTitle = `${(track?.title ?? text.language).toUpperCase()} LEARNING STUDIO`;

  const speechLocale = passportSpeechLocale(track);

  useEffect(
    () => () => {
      if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
      const recorder = listeningRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      listeningStreamRef.current?.getTracks().forEach((item) => item.stop());
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const playListening = () => {
    if (!listeningText || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(listeningText);
    utterance.lang = speechLocale;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const releaseListeningStream = () => {
    listeningStreamRef.current?.getTracks().forEach((item) => item.stop());
    listeningStreamRef.current = null;
  };

  const startListeningRepeat = async () => {
    if (!listeningText || listeningRecording || listeningTranscribing) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(locale === "en" ? "Microphone recording is not supported in this browser." : "A gravação de microfone não é compatível com este navegador.");
      return;
    }
    try {
      window.speechSynthesis?.cancel();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      listeningStreamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      listeningChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) listeningChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
        listeningTimerRef.current = null;
        setListeningRecording(false);
        releaseListeningStream();
        const chunks = listeningChunksRef.current;
        listeningChunksRef.current = [];
        if (!chunks.length) return;
        setListeningTranscribing(true);
        try {
          const transcript = await transcribeVoiceAudio(
            new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
            speechLocale,
          );
          setListeningTranscript(transcript);
          setListeningMatch(textMatchPercent(listeningText, transcript));
        } catch {
          toast.error(locale === "en" ? "This recording could not be analyzed." : "Não foi possível analisar esta gravação.");
        } finally {
          setListeningTranscribing(false);
        }
      };
      listeningRecorderRef.current = recorder;
      setListeningTranscript("");
      setListeningMatch(null);
      recorder.start(250);
      setListeningRecording(true);
      listeningTimerRef.current = window.setTimeout(() => {
        const active = listeningRecorderRef.current;
        if (active && active.state !== "inactive") active.stop();
      }, 45_000);
    } catch {
      releaseListeningStream();
      setListeningRecording(false);
      toast.error(locale === "en" ? "Allow microphone access to practice repetition." : "Permita o acesso ao microfone para praticar repetição.");
    }
  };

  const stopListeningRepeat = () => {
    if (listeningTimerRef.current !== null) window.clearTimeout(listeningTimerRef.current);
    listeningTimerRef.current = null;
    const recorder = listeningRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const saveVocabulary = () => {
    const term = vocabularyTerm.trim();
    if (!term || vocabularyBusy) return;
    addVocabulary(term, vocabularyTranslation.trim(), vocabularyContext.trim());
    setVocabularyTerm("");
    setVocabularyTranslation("");
    setVocabularyContext("");
  };

  return (
    <div className="grid gap-5">
      <section className="v2-surface passport-status rounded-3xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{track?.title ?? text.language}</p>
            <h2 className="mt-2 text-3xl font-semibold">{text.level} {profile.currentLevel}</h2>
          </div>
          <div className="text-right"><p className="text-2xl font-semibold">{Math.round(progress)}%</p><p className="text-xs text-muted-foreground">{text.progress}</p></div>
        </div>
        <div className="mt-5"><WorkspaceProgress label={text.progress} value={progress} /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{text.streak}</p>
            <p className="mt-2 text-xl font-semibold">{retention?.currentStreak ?? 0} {text.streakDays}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{text.activeWeek}</p>
            <p className="mt-2 text-xl font-semibold">{retention?.activeDaysLast7 ?? 0}/7</p>
          </div>
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{text.longestStreak}</p>
            <p className="mt-2 text-xl font-semibold">{retention?.longestStreak ?? 0} {text.streakDays}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {retention?.activeToday ? text.todayActive : text.todayPending}
            </p>
          </div>
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">{locale === "en" ? "Synchronizing Passport…" : "Sincronizando Passport…"}</p> : null}

      <section className="passport-learning-studio" aria-labelledby="passport-studio-title">
        <div className="passport-studio-grid" aria-hidden="true" />
        <div className="passport-studio-orb passport-studio-orb-a" aria-hidden="true" />
        <div className="passport-studio-orb passport-studio-orb-b" aria-hidden="true" />

        <div className="passport-studio-topline">
          <div>
            <p className="passport-studio-eyebrow">{studioTitle}</p>
            <p className="passport-studio-signal"><span /> LIVE LEARNING SIGNAL</p>
          </div>
          <div className="passport-studio-progress">{Math.round(progress)}%</div>
        </div>

        <div className="passport-lesson-bubble">
          <div className="passport-kivi" aria-hidden="true">
            <div className="passport-kivi-antenna" />
            <div className="passport-kivi-face"><span /><span /></div>
            <div className="passport-kivi-mouth" />
          </div>
          <div className="passport-lesson-copy">
            <p className="passport-guide-label">{text.guide}</p>
            <p className="passport-current-label">{text.currentLesson}</p>
            <h3 id="passport-studio-title">{nextLesson?.title ?? text.noLesson}</h3>
            <p>{nextLesson?.description || text.guideReady}</p>
            {nextLesson ? (
              <div className="passport-lesson-meta">
                <span>{nextLesson.difficulty}</span>
                <span>{nextLesson.estimatedMinutes} {text.minutesShort}</span>
              </div>
            ) : null}
            {nextLesson ? <Button className="mt-4" size="sm" onClick={() => completeLesson(nextLesson.id)}>{text.complete}</Button> : null}
          </div>
        </div>

        <div className="passport-destinations">
          <p>{text.internationalContext}</p>
          <div>
            {destinations.map((destination) => (
              <span key={destination.label}><b>{destination.flag}</b>{destination.label}</span>
            ))}
          </div>
        </div>

        <div className="passport-route-panel">
          <div className="passport-route-heading">
            <div><p>{text.route}</p><h4>{text.routeBody}</h4></div>
            <strong>{completed}/{lessons.length}</strong>
          </div>
          <div className="passport-route-track">
            {routeStages.map((stage, index) => {
              const threshold = [0, 34, 67, 100][index];
              const active = progress >= threshold;
              return (
                <div key={stage} className={`passport-route-step ${active ? "is-active" : ""}`}>
                  <span>{index + 1}</span>
                  <small>{stage}</small>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="v2-surface rounded-2xl p-5">
          <h3 className="text-lg font-semibold">{text.listening}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{listeningText || text.noListening}</p>
          {listeningText ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={playListening}>{text.listen}</Button>
              <Button
                variant="outline"
                disabled={listeningTranscribing}
                onClick={() => (listeningRecording ? stopListeningRepeat() : void startListeningRepeat())}
              >
                {listeningTranscribing
                  ? text.transcribing
                  : listeningRecording
                    ? text.stopRecording
                    : text.repeat}
              </Button>
            </div>
          ) : null}
          {listeningTranscript ? (
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{text.heard}</p>
              <p className="mt-2 text-sm">{listeningTranscript}</p>
              <p className="mt-3 font-semibold">{text.textMatch}: {listeningMatch ?? 0}%</p>
              <p className="mt-2 text-xs text-muted-foreground">{text.pronunciationNote}</p>
            </div>
          ) : null}
        </article>

        <article className="v2-surface rounded-2xl p-5">
          <h3 className="text-lg font-semibold">{text.vocabulary}</h3>
          <div className="mt-4 grid gap-2 rounded-xl border border-border bg-background/40 p-4">
            <p className="text-sm font-medium">{text.addVocabulary}</p>
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" maxLength={160} value={vocabularyTerm} placeholder={text.termPlaceholder} onChange={(event) => setVocabularyTerm(event.target.value)} />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" value={vocabularyTranslation} placeholder={text.translationPlaceholder} onChange={(event) => setVocabularyTranslation(event.target.value)} />
            <input className="rounded-xl border border-border bg-background px-3 py-2 text-sm" value={vocabularyContext} placeholder={text.contextPlaceholder} onChange={(event) => setVocabularyContext(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveVocabulary(); }} />
            <Button size="sm" disabled={!vocabularyTerm.trim() || vocabularyBusy} onClick={saveVocabulary}>{vocabularyBusy ? text.savingWord : text.saveWord}</Button>
          </div>
          {!vocabulary.length ? <p className="mt-3 text-sm text-muted-foreground">{text.noVocabulary}</p> : null}
          <div className="mt-4 grid gap-3">
            {vocabulary.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4">
                <p className="font-medium">{item.term}</p><p className="text-sm text-muted-foreground">{item.translation}</p>{item.context ? <p className="mt-1 text-xs text-muted-foreground">{item.context}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">{[[1, text.again], [3, text.hard], [4, text.good], [5, text.easy]].map(([grade, label]) => <Button key={String(grade)} size="sm" variant="outline" onClick={() => reviewVocabulary(item.id, Number(grade))}>{label}</Button>)}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="v2-surface rounded-2xl p-5">
          <h3 className="text-lg font-semibold">{text.missions}</h3>
          {!missions.length ? <p className="mt-3 text-sm text-muted-foreground">{text.noMissions}</p> : null}
          <div className="mt-4 grid gap-3">{missions.map((mission) => <div key={mission.id} className="rounded-xl border border-border p-4"><p className="font-medium">{mission.title}</p><p className="mt-1 text-sm text-muted-foreground">{mission.prompt}</p>{mission.status === "pending" ? <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => updateMission(mission.id, "completed")}>{text.finishMission}</Button><Button size="sm" variant="outline" onClick={() => updateMission(mission.id, "skipped")}>{text.skipMission}</Button></div> : <p className="mt-2 text-xs uppercase text-muted-foreground">{mission.status}</p>}</div>)}</div>
        </article>

        <article className="v2-surface rounded-2xl p-5">
          <h3 className="text-lg font-semibold">{text.roleplay}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{text.roleplayBody}</p>
          {!activeSession ? (
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="grid min-w-52 gap-2 text-sm"><span className="text-muted-foreground">{text.scenario}</span><select className="rounded-xl border border-border bg-background px-3 py-3" value={scenario} onChange={(e) => setScenario(e.target.value as (typeof scenarios)[number])}>{scenarios.map((item) => <option key={item} value={item}>{text[item]}</option>)}</select></label>
              <Button disabled={roleplayBusy} onClick={() => startRoleplay(scenario)}>{text.startRoleplay}</Button>
            </div>
          ) : (
            <div className="mt-5">
              <div className="max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-border bg-background/40 p-4">{activeSession.transcript.length ? activeSession.transcript.map((entry, index) => <div key={`${entry.createdAt}-${index}`} className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${entry.role === "user" ? "ml-auto bg-primary/15" : "bg-surface"}`}><p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.role === "user" ? (locale === "en" ? "You" : "Você") : "KIVRYN"}</p><p className="mt-1 whitespace-pre-wrap">{entry.content}</p></div>) : <p className="text-sm text-muted-foreground">{text.noMessages}</p>}</div>
              <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3" value={message} maxLength={1200} placeholder={text.message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && message.trim() && !roleplayBusy) { sendRoleplay(activeSession.id, message.trim()); setMessage(""); } }} /><Button disabled={!message.trim() || roleplayBusy} onClick={() => { sendRoleplay(activeSession.id, message.trim()); setMessage(""); }}>{text.send}</Button><Button variant="outline" disabled={roleplayBusy} onClick={() => endRoleplay(activeSession.id)}>{text.end}</Button></div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
