import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { usePassportHome } from "@/hooks/use-passport";
import { radius, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const P = {
  canvas: "#050913",
  panel: "#0A1220",
  panelBlue: "#0B1B35",
  panelPurple: "#17122E",
  cyan: "#52E5FF",
  blue: "#6C7CFF",
  purple: "#B678FF",
  mint: "#5CF0B1",
  gold: "#FFC96B",
  coral: "#FF7F86",
  text: "#F4F8FF",
  muted: "#91A0B8",
  border: "#1A2A42",
};

const copy = {
  "pt-BR": {
    title: "KIVRYN Passport",
    subtitle: "Seu painel internacional para aprender, praticar e chegar pronto.",
    system: "INTERNATIONAL READINESS SYSTEM",
    loading: "Preparando o KIVRYN Passport…",
    errorTitle: "Não foi possível sincronizar o KIVRYN Passport.",
    errorBody: "Seus dados do Passport não foram alterados. Verifique a conexão e tente novamente.",
    noProfile: "Seu Passport ainda não foi configurado",
    noProfileCopy: "Escolha um idioma, faça o teste de nível e deixe a KIVRYN montar seu plano internacional.",
    language: "Idioma",
    level: "Nível",
    levelPending: "Aguardando teste",
    progress: "pronto",
    lessons: "Lições",
    vocabulary: "Revisões",
    missions: "Missões",
    placement: "TESTE DE NÍVEL PENDENTE",
    placementTitle: "Defina seu ponto de partida",
    placementBody: "O Passport precisa descobrir seu nível real antes de montar sua rota de aprendizado.",
    placementAction: "Fazer teste de nível",
    nextLesson: "PRÓXIMA PARADA",
    nothingNext: "Nenhuma lição disponível agora.",
    openLesson: "Entrar na aula",
    dailyMission: "MISSÃO DE HOJE",
    noMission: "Nenhuma missão criada para hoje.",
    missionsAction: "Ver missões",
    reviewQueue: "REVISÃO INTELIGENTE",
    allClear: "Tudo revisado por enquanto.",
    reviewNow: "Revisar agora",
    listening: "LISTENING LAB",
    listeningTitle: "Treine o ouvido em outro ritmo",
    listeningBody: "Ouça exemplos das suas lições em velocidade normal ou lenta.",
    listeningAction: "Abrir Listening Lab",
    roleplay: "SIMULATION ROOM",
    roleplayTitle: "Entre em situações reais",
    roleplayBody: "Treine aeroporto, hotel, restaurante, transporte e outras situações antes de viver isso no mundo real.",
    roleplayAction: "Entrar na simulação",
    refresh: "Atualizar Passport",
    completed: "concluídas",
    pending: "pendentes",
    journey: "SUA ROTA",
    journeyBody: "Cada etapa deixa você mais pronto para agir fora da tela.",
    guide: "NOVA · PASSPORT GUIDE",
    guideReady: "Seu próximo passo está pronto. Vamos avançar uma etapa hoje?",
    guidePlacement: "Primeiro eu preciso descobrir seu nível. Depois monto a rota certa para você.",
    guideSetup: "Configure seu Passport e eu organizo sua primeira rota internacional.",
    scenarios: "CENÁRIOS DE PRÁTICA",
    airport: "Aeroporto",
    hotel: "Hotel",
    restaurant: "Restaurante",
    survival: "Situações reais",
    route: "Mapa de aprendizado",
  },
  en: {
    title: "KIVRYN Passport",
    subtitle: "Your international dashboard to learn, practice and arrive ready.",
    system: "INTERNATIONAL READINESS SYSTEM",
    loading: "Preparing KIVRYN Passport…",
    errorTitle: "KIVRYN Passport could not be synchronized.",
    errorBody: "Your Passport data was not changed. Check your connection and try again.",
    noProfile: "Your Passport is not configured yet",
    noProfileCopy: "Choose a language, take the placement test and let KIVRYN build your international plan.",
    language: "Language",
    level: "Level",
    levelPending: "Awaiting test",
    progress: "ready",
    lessons: "Lessons",
    vocabulary: "Reviews",
    missions: "Missions",
    placement: "PLACEMENT TEST PENDING",
    placementTitle: "Set your starting point",
    placementBody: "Passport needs your real level before it can build the right learning route.",
    placementAction: "Take placement test",
    nextLesson: "NEXT STOP",
    nothingNext: "No lesson is available right now.",
    openLesson: "Enter lesson",
    dailyMission: "TODAY'S MISSION",
    noMission: "No mission was created for today.",
    missionsAction: "View missions",
    reviewQueue: "SMART REVIEW",
    allClear: "You're all caught up for now.",
    reviewNow: "Review now",
    listening: "LISTENING LAB",
    listeningTitle: "Train your ear at another pace",
    listeningBody: "Listen to examples from your lessons at normal or slow speed.",
    listeningAction: "Open Listening Lab",
    roleplay: "SIMULATION ROOM",
    roleplayTitle: "Step into real situations",
    roleplayBody: "Practice airport, hotel, restaurant, transport and other situations before facing them in the real world.",
    roleplayAction: "Enter simulation",
    refresh: "Refresh Passport",
    completed: "completed",
    pending: "pending",
    journey: "YOUR ROUTE",
    journeyBody: "Every step makes you more ready to act outside the screen.",
    guide: "NOVA · PASSPORT GUIDE",
    guideReady: "Your next step is ready. Shall we move forward today?",
    guidePlacement: "First I need to discover your level. Then I can build the right route for you.",
    guideSetup: "Set up your Passport and I'll organize your first international route.",
    scenarios: "PRACTICE SCENARIOS",
    airport: "Airport",
    hotel: "Hotel",
    restaurant: "Restaurant",
    survival: "Real situations",
    route: "Learning map",
  },
} as const;

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PassportHome() {
  const { resolvedLocale } = useLanguage();
  const c = copy[resolvedLocale];
  const missionDate = useMemo(localDateKey, []);
  const passport = usePassportHome(missionDate);

  if (passport.isPending) return <LoadingState title={c.loading} />;
  if (passport.isError) {
    return (
      <ErrorState
        title={c.errorTitle}
        message={c.errorBody}
        actionLabel={c.refresh}
        onAction={() => passport.refetch()}
      />
    );
  }

  const data = passport.data;
  const profile = data?.profile ?? null;
  const track = profile ? data?.tracks.find((item) => item.id === profile.trackId) ?? null : null;
  const needsPlacement = Boolean(profile && profile.placementScore == null);
  const nextLesson = data?.lessons.find((lesson) => lesson.status !== "completed") ?? null;
  const nextMission = data?.missions.find((mission) => mission.status === "pending") ?? null;
  const dueVocabulary = data?.dueVocabulary ?? [];
  const progress = needsPlacement ? 0 : Math.min(100, data?.progressPercent ?? 0);
  const guideMessage = !profile ? c.guideSetup : needsPlacement ? c.guidePlacement : c.guideReady;

  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroOrbOne} />
        <View pointerEvents="none" style={styles.heroOrbTwo} />
        <View style={styles.heroHeader}>
          <View style={styles.passportMark}>
            <Text style={styles.passportMarkText}>K</Text>
          </View>
          <View style={styles.heroBrand}>
            <Text style={styles.eyebrow}>{c.system}</Text>
            <Text style={styles.heroTitle}>{c.title}</Text>
          </View>
        </View>
        <Text style={styles.heroCopy}>{c.subtitle}</Text>

        {profile ? (
          <>
            <View style={styles.identityRow}>
              <View style={styles.identityCopy}>
                <Text style={styles.language}>{track?.title ?? c.language}</Text>
                <Text style={styles.level}>
                  {c.level} · {needsPlacement ? c.levelPending : profile.currentLevel}
                </Text>
              </View>
              <View style={styles.progressDisc}>
                <Text style={styles.progressValue}>{progress}%</Text>
                <Text style={styles.progressLabel}>{c.progress}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>{c.noProfile}</Text>
            <Text style={styles.emptyCopy}>{c.noProfileCopy}</Text>
          </View>
        )}
      </View>

      <GuideCard label={c.guide} message={guideMessage} />

      {profile ? (
        needsPlacement ? (
          <ColorSection
            accent={P.gold}
            glow="#5C4015"
            label={c.placement}
            title={c.placementTitle}
            body={c.placementBody}
            actionLabel={c.placementAction}
            onPress={() => router.push("/passport/placement")}
          />
        ) : (
          <>
            <View style={styles.metrics}>
              <Metric accent={P.blue} label={c.lessons} value={`${data?.completedLessons ?? 0}/${data?.lessons.length ?? 0}`} detail={c.completed} />
              <Metric accent={P.purple} label={c.vocabulary} value={String(dueVocabulary.length)} detail={c.pending} />
              <Metric accent={P.mint} label={c.missions} value={`${data?.completedMissions ?? 0}/${data?.missions.length ?? 0}`} detail={c.completed} />
            </View>

            <View style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View>
                  <Text style={styles.routeEyebrow}>{c.journey}</Text>
                  <Text style={styles.routeTitle}>{c.route}</Text>
                </View>
                <Text style={styles.routePercent}>{progress}%</Text>
              </View>
              <Text style={styles.routeBody}>{c.journeyBody}</Text>
              <View style={styles.routeLine}>
                {[P.cyan, P.blue, P.purple, P.mint].map((tone, index) => (
                  <View key={tone} style={styles.routeNodeWrap}>
                    {index > 0 ? <View style={[styles.routeConnector, { backgroundColor: progress >= index * 25 ? tone : P.border }]} /> : null}
                    <View
                      style={[
                        styles.routeNode,
                        {
                          borderColor: tone,
                          backgroundColor: progress >= index * 25 ? tone : P.panel,
                        },
                      ]}
                    >
                      <Text style={[styles.routeNodeText, { color: progress >= index * 25 ? P.canvas : tone }]}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <ColorSection
              accent={P.cyan}
              glow="#062B3A"
              label={c.nextLesson}
              title={nextLesson?.title ?? c.nothingNext}
              body={nextLesson?.description ?? ""}
              actionLabel={nextLesson ? c.openLesson : undefined}
              onPress={
                nextLesson
                  ? () =>
                      router.push({
                        pathname: "/passport/lesson/[lessonId]",
                        params: { lessonId: nextLesson.id },
                      })
                  : undefined
              }
            />

            <Text style={styles.sectionHeading}>{c.scenarios}</Text>
            <View style={styles.scenarioGrid}>
              <ScenarioCard tone={P.blue} symbol="✈" label={c.airport} onPress={() => router.push("/passport/roleplay")} />
              <ScenarioCard tone={P.purple} symbol="◆" label={c.hotel} onPress={() => router.push("/passport/roleplay")} />
              <ScenarioCard tone={P.coral} symbol="●" label={c.restaurant} onPress={() => router.push("/passport/roleplay")} />
            </View>

            <ColorSection
              accent={P.mint}
              glow="#073126"
              label={c.dailyMission}
              title={nextMission?.title ?? c.noMission}
              body={nextMission?.prompt ?? ""}
              actionLabel={c.missionsAction}
              onPress={() => router.push("/passport/missions")}
            />
            <ColorSection
              accent={P.purple}
              glow="#24113B"
              label={c.reviewQueue}
              title={dueVocabulary[0]?.term ?? c.allClear}
              body={dueVocabulary.length ? `${dueVocabulary.length} ${c.pending}` : ""}
              actionLabel={dueVocabulary.length ? c.reviewNow : undefined}
              onPress={dueVocabulary.length ? () => router.push("/passport/review") : undefined}
            />
            <ColorSection
              accent={P.gold}
              glow="#38270B"
              label={c.listening}
              title={c.listeningTitle}
              body={c.listeningBody}
              actionLabel={c.listeningAction}
              onPress={() => router.push("/passport/listening")}
            />
            <ColorSection
              accent={P.blue}
              glow="#111A4B"
              label={c.roleplay}
              title={c.roleplayTitle}
              body={c.roleplayBody}
              actionLabel={c.roleplayAction}
              onPress={() => router.push("/passport/roleplay")}
            />
          </>
        )
      ) : null}

      <Pressable style={styles.refreshButton} onPress={() => passport.refetch()}>
        <Text style={styles.refreshText}>{c.refresh}</Text>
      </Pressable>
    </AppScreen>
  );
}

function GuideCard({ label, message }: { label: string; message: string }) {
  return (
    <View style={styles.guideCard}>
      <View style={styles.robotWrap}>
        <View style={styles.antenna} />
        <View style={styles.robotHead}>
          <View style={styles.robotEyeRow}>
            <View style={styles.robotEye} />
            <View style={styles.robotEye} />
          </View>
          <View style={styles.robotMouth} />
        </View>
        <View style={styles.robotBody}>
          <View style={styles.robotCore} />
        </View>
      </View>
      <View style={styles.guideCopy}>
        <Text style={styles.guideLabel}>{label}</Text>
        <Text style={styles.guideMessage}>{message}</Text>
      </View>
    </View>
  );
}

function Metric({ accent, label, value, detail }: { accent: string; label: string; value: string; detail: string }) {
  return (
    <View style={[styles.metricCard, { borderColor: `${accent}66` }]}>
      <View style={[styles.metricDot, { backgroundColor: accent }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function ScenarioCard({ tone, symbol, label, onPress }: { tone: string; symbol: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.scenarioCard, { borderColor: `${tone}66` }, pressed && styles.pressed]}>
      <View style={[styles.scenarioSymbol, { backgroundColor: `${tone}22` }]}>
        <Text style={[styles.scenarioSymbolText, { color: tone }]}>{symbol}</Text>
      </View>
      <Text style={styles.scenarioLabel}>{label}</Text>
      <Text style={[styles.scenarioArrow, { color: tone }]}>↗</Text>
    </Pressable>
  );
}

function ColorSection({
  accent,
  glow,
  label,
  title,
  body,
  actionLabel,
  onPress,
}: {
  accent: string;
  glow: string;
  label: string;
  title: string;
  body: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View pointerEvents="none" style={[styles.sectionGlow, { backgroundColor: glow }]} />
      <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
      <Text style={[styles.sectionLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
      {actionLabel ? <Text style={[styles.sectionAction, { color: accent }]}>{actionLabel} →</Text> : null}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.section, { borderColor: `${accent}55` }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.section, { borderColor: `${accent}55` }]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xl, backgroundColor: P.canvas },
  hero: {
    overflow: "hidden",
    padding: spacing.lg,
    borderRadius: 30,
    backgroundColor: P.panelBlue,
    borderWidth: 1,
    borderColor: "#1D4770",
  },
  heroOrbOne: { position: "absolute", width: 220, height: 220, borderRadius: 220, right: -80, top: -90, backgroundColor: "#1C4BB0", opacity: 0.28 },
  heroOrbTwo: { position: "absolute", width: 180, height: 180, borderRadius: 180, left: -90, bottom: -100, backgroundColor: "#7A38D7", opacity: 0.2 },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  passportMark: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#101E38", borderWidth: 1, borderColor: P.cyan },
  passportMarkText: { color: P.cyan, fontSize: 24, fontWeight: "900" },
  heroBrand: { flex: 1 },
  eyebrow: { ...typography.eyebrow, color: P.cyan },
  heroTitle: { ...typography.title, color: P.text, marginTop: 2 },
  heroCopy: { ...typography.body, color: "#B3C4DB", marginTop: spacing.md, maxWidth: 440 },
  identityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.xl },
  identityCopy: { flex: 1 },
  language: { ...typography.heading, color: P.text },
  level: { ...typography.body, color: P.muted, marginTop: spacing.xs },
  progressDisc: { width: 82, height: 82, borderRadius: 82, alignItems: "center", justifyContent: "center", backgroundColor: "#07111F", borderWidth: 1, borderColor: P.cyan },
  progressValue: { ...typography.heading, color: P.cyan },
  progressLabel: { ...typography.caption, color: P.muted },
  progressTrack: { height: 7, backgroundColor: "#10233A", borderRadius: 99, overflow: "hidden", marginTop: spacing.lg },
  progressFill: { height: "100%", backgroundColor: P.cyan, borderRadius: 99 },
  emptyBlock: { marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: "#07101F99" },
  emptyTitle: { ...typography.heading, color: P.text },
  emptyCopy: { ...typography.body, color: P.muted, marginTop: spacing.sm },
  guideCard: { marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: 24, backgroundColor: P.panelPurple, borderWidth: 1, borderColor: "#513C7A" },
  robotWrap: { width: 76, height: 86, alignItems: "center", justifyContent: "flex-end" },
  antenna: { width: 3, height: 12, backgroundColor: P.purple, borderRadius: 3, marginBottom: -1 },
  robotHead: { width: 58, height: 44, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#211A3E", borderWidth: 1, borderColor: P.purple },
  robotEyeRow: { flexDirection: "row", gap: 13 },
  robotEye: { width: 8, height: 8, borderRadius: 8, backgroundColor: P.cyan },
  robotMouth: { width: 20, height: 3, borderRadius: 3, backgroundColor: "#7E6AAF", marginTop: 8 },
  robotBody: { width: 45, height: 28, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, alignItems: "center", paddingTop: 6, backgroundColor: "#17132D", borderWidth: 1, borderTopWidth: 0, borderColor: "#513C7A" },
  robotCore: { width: 9, height: 9, borderRadius: 9, backgroundColor: P.mint },
  guideCopy: { flex: 1 },
  guideLabel: { ...typography.eyebrow, color: P.purple },
  guideMessage: { ...typography.body, color: P.text, marginTop: spacing.xs },
  metrics: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metricCard: { flex: 1, minHeight: 118, padding: spacing.md, borderRadius: 22, backgroundColor: P.panel, borderWidth: 1 },
  metricDot: { width: 8, height: 8, borderRadius: 8, marginBottom: spacing.sm },
  metricLabel: { ...typography.caption, color: P.muted },
  metricValue: { ...typography.heading, marginTop: spacing.xs },
  metricDetail: { ...typography.caption, color: P.muted, marginTop: 2 },
  routeCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: 26, backgroundColor: "#091526", borderWidth: 1, borderColor: "#22395A" },
  routeHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  routeEyebrow: { ...typography.eyebrow, color: P.blue },
  routeTitle: { ...typography.heading, color: P.text, marginTop: 4 },
  routePercent: { ...typography.heading, color: P.cyan },
  routeBody: { ...typography.body, color: P.muted, marginTop: spacing.sm },
  routeLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg },
  routeNodeWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  routeConnector: { height: 2, flex: 1 },
  routeNode: { width: 34, height: 34, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  routeNodeText: { fontWeight: "900", fontSize: 12 },
  sectionHeading: { ...typography.eyebrow, color: P.muted, marginTop: spacing.lg, marginBottom: spacing.sm },
  scenarioGrid: { flexDirection: "row", gap: spacing.sm },
  scenarioCard: { flex: 1, minHeight: 132, padding: spacing.md, borderRadius: 22, backgroundColor: P.panel, borderWidth: 1 },
  scenarioSymbol: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  scenarioSymbolText: { fontSize: 19, fontWeight: "900" },
  scenarioLabel: { ...typography.label, color: P.text, marginTop: spacing.md },
  scenarioArrow: { fontSize: 18, fontWeight: "900", alignSelf: "flex-end", marginTop: "auto" },
  section: { overflow: "hidden", marginTop: spacing.md, padding: spacing.lg, borderRadius: 26, backgroundColor: P.panel, borderWidth: 1 },
  sectionGlow: { position: "absolute", width: 180, height: 180, borderRadius: 180, right: -90, top: -100, opacity: 0.45 },
  sectionAccent: { width: 34, height: 4, borderRadius: 4, marginBottom: spacing.md },
  sectionLabel: { ...typography.eyebrow },
  sectionTitle: { ...typography.heading, color: P.text, marginTop: spacing.sm },
  sectionBody: { ...typography.body, color: P.muted, marginTop: spacing.sm },
  sectionAction: { ...typography.label, marginTop: spacing.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.995 }] },
  refreshButton: { marginTop: spacing.lg, marginBottom: spacing.lg, alignItems: "center", justifyContent: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: "#0B1422", borderWidth: 1, borderColor: P.border },
  refreshText: { ...typography.label, color: P.text },
});
