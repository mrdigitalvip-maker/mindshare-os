import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  listCreatorConnections,
  listCreatorContent,
  listCreatorManualSnapshots,
  listCreatorProjects,
  loadCreatorProfile,
  loadCreatorStrategy,
  type CreatorProject,
} from "@/services/creator-service";
import { creatorNextAction, type CreatorNextAction } from "@/lib/creator";
import { createTask } from "@/services/workspace-service";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";

const copy = {
  "pt-BR": {
    eyebrow: "CREATOR OPERATING CENTER",
    title: "Crie mais. Aprenda com os resultados. Cresça com um sistema.",
    subtitle:
      "Transforme vídeos em conteúdo, organize sua estratégia e use dados reais para decidir o próximo movimento.",
    systemLive: "Sistema do criador ativo",
    start: "Criar a partir de um vídeo",
    ask: "Planejar com KIVRYN",
    projects: "projetos",
    completed: "finalizados",
    published: "conteúdos",
    samples: "amostras",
    pipeline: "PIPELINE ATIVO",
    noPipeline: "Nenhum processamento em andamento.",
    openStudio: "Abrir Studio",
    nextMove: "PRÓXIMO MOVIMENTO",
    createTask: "Transformar em tarefa",
    loop: "CREATOR LOOP",
    loopCopy: "Um ciclo simples para manter criação, distribuição e aprendizado acontecendo.",
    create: "1 · Criar",
    createCopy: "Envie um vídeo e deixe a KIVRYN encontrar os melhores momentos.",
    publish: "2 · Publicar",
    publishCopy: "Leve os cortes para seus canais com pacote de postagem.",
    measure: "3 · Medir",
    measureCopy: "Registre ou sincronize resultados reais.",
    improve: "4 · Melhorar",
    improveCopy: "Use seus próprios dados para decidir o próximo conteúdo.",
    intelligence: "KIVRYN CREATOR INTELLIGENCE",
    intelligenceCopy:
      "Perfil, estratégia, conteúdo e resultados trabalham juntos. Quanto mais sinais reais, mais útil fica a próxima recomendação.",
    connected: "plataformas conectadas",
    reviewIntelligence: "Abrir Intelligence",
    tools: "FERRAMENTAS DO CRIADOR",
    studio: "Viral Clips Studio",
    hooks: "Hook Lab",
    analytics: "Analytics",
    library: "Biblioteca",
    strategy: "Estratégia",
    academy: "Creator Academy",
    profile: "Perfil do criador",
    media: "Mídia",
    recent: "PROJETOS RECENTES",
    empty: "Seu primeiro projeto começa com um vídeo real.",
    refresh: "Atualizar",
    loadError: "Não foi possível sincronizar o Creator Center agora.",
  },
  en: {
    eyebrow: "CREATOR OPERATING CENTER",
    title: "Create more. Learn from results. Grow with a system.",
    subtitle:
      "Turn videos into content, organize your strategy and use real data to decide the next move.",
    systemLive: "Creator system active",
    start: "Create from a video",
    ask: "Plan with KIVRYN",
    projects: "projects",
    completed: "finished",
    published: "content",
    samples: "samples",
    pipeline: "ACTIVE PIPELINE",
    noPipeline: "No processing jobs right now.",
    openStudio: "Open Studio",
    nextMove: "NEXT MOVE",
    createTask: "Turn into task",
    loop: "CREATOR LOOP",
    loopCopy: "A simple loop that keeps creation, distribution and learning moving.",
    create: "1 · Create",
    createCopy: "Upload a video and let KIVRYN find its strongest moments.",
    publish: "2 · Publish",
    publishCopy: "Take clips to your channels with a posting package.",
    measure: "3 · Measure",
    measureCopy: "Log or sync real results.",
    improve: "4 · Improve",
    improveCopy: "Use your own data to decide what to create next.",
    intelligence: "KIVRYN CREATOR INTELLIGENCE",
    intelligenceCopy:
      "Profile, strategy, content and results work together. More real signals make the next recommendation more useful.",
    connected: "connected platforms",
    reviewIntelligence: "Open Intelligence",
    tools: "CREATOR TOOLS",
    studio: "Viral Clips Studio",
    hooks: "Hook Lab",
    analytics: "Analytics",
    library: "Library",
    strategy: "Strategy",
    academy: "Creator Academy",
    profile: "Creator profile",
    media: "Media",
    recent: "RECENT PROJECTS",
    empty: "Your first project starts with a real video.",
    refresh: "Refresh",
    loadError: "Creator Center could not sync right now.",
  },
} as const;

const nextCopy: Record<CreatorNextAction, { pt: string; en: string; href: string }> = {
  complete_setup: {
    pt: "Complete seu perfil de criador para a KIVRYN entender sua identidade, nicho e objetivo.",
    en: "Complete your creator profile so KIVRYN understands your identity, niche and goal.",
    href: "/creator/profile",
  },
  build_strategy: {
    pt: "Defina sua estratégia para transformar ideias soltas em um sistema de conteúdo repetível.",
    en: "Define your strategy to turn scattered ideas into a repeatable content system.",
    href: "/creator/strategy",
  },
  add_content: {
    pt: "Adicione seu primeiro conteúdo publicado para começar a construir inteligência baseada no seu histórico.",
    en: "Add your first published content to start building intelligence from your own history.",
    href: "/creator/analytics",
  },
  update_results: {
    pt: "Registre mais resultados reais. Com pelo menos 5 amostras, a KIVRYN começa a comparar padrões com mais segurança.",
    en: "Log more real results. With at least 5 samples, KIVRYN can compare patterns with more confidence.",
    href: "/creator/analytics",
  },
  review_intelligence: {
    pt: "Você já tem sinais suficientes para revisar padrões de desempenho e decidir o próximo experimento.",
    en: "You already have enough signals to review performance patterns and choose the next experiment.",
    href: "/creator/map",
  },
};

const processingStates = new Set(["uploading", "queued", "analyzing", "transcribing", "selecting_clips", "rendering"]);

export default function CreatorCenter() {
  const { session } = useAuth();
  const { resolvedLocale } = useLanguage();
  const language = resolvedLocale?.startsWith("en") ? "en" : "pt-BR";
  const c = copy[language];
  const [projects, setProjects] = useState<CreatorProject[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextAction, setNextAction] = useState<CreatorNextAction>("complete_setup");
  const [contentCount, setContentCount] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);

  const load = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    setError(false);
    const [projectResult, profileResult, strategyResult, contentResult, analyticsResult, connectionResult] =
      await Promise.allSettled([
        listCreatorProjects(userId),
        loadCreatorProfile(userId),
        loadCreatorStrategy(userId),
        listCreatorContent(userId),
        listCreatorManualSnapshots(userId),
        listCreatorConnections(userId),
      ]);
    if (projectResult.status === "fulfilled") setProjects(projectResult.value);
    else setError(true);
    const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
    const strategy = strategyResult.status === "fulfilled" ? strategyResult.value : null;
    const content = contentResult.status === "fulfilled" ? contentResult.value : [];
    const analytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : [];
    const connections = connectionResult.status === "fulfilled" ? connectionResult.value : [];
    setContentCount(content.length);
    setSampleCount(analytics.length);
    setConnectedCount(connections.filter((item) => item.status === "connected").length);
    setNextAction(
      creatorNextAction({
        hasProfile: Boolean(profile),
        hasStrategy: Boolean(strategy),
        contentCount: content.length,
        analyticsSampleCount: analytics.length,
      }),
    );
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeProjects = useMemo(
    () => projects.filter((project) => processingStates.has(project.status)),
    [projects],
  );
  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "completed").length,
    [projects],
  );
  const move = nextCopy[nextAction];
  const nextMoveCopy = language === "en" ? move.en : move.pt;

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCreatorAI = () => {
    const context =
      language === "en"
        ? `Act as KIVRYN Creator Intelligence. Current real creator state: ${projects.length} creator projects, ${completedProjects} completed projects, ${contentCount} published content records, ${sampleCount} result samples and ${connectedCount} connected platforms. Help choose the single highest-value next creator move. Do not invent analytics or virality.`
        : `Atue como KIVRYN Creator Intelligence. Estado real atual do criador: ${projects.length} projetos do Creator, ${completedProjects} projetos finalizados, ${contentCount} conteúdos publicados registrados, ${sampleCount} amostras de resultados e ${connectedCount} plataformas conectadas. Escolha o único próximo movimento de maior valor para o criador. Não invente analytics nem viralidade.`;
    router.push({ pathname: "/assistant", params: { context } });
  };

  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.eyebrow}>{c.eyebrow}</Text>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>{c.systemLive}</Text>
          </View>
        </View>
        <Text style={s.display}>{c.title}</Text>
        <Text style={s.heroCopy}>{c.subtitle}</Text>
        <Pressable style={s.primary} onPress={() => router.push("/creator/new")}>
          <Text style={s.primaryText}>{c.start}</Text>
        </Pressable>
        <Pressable style={s.secondary} onPress={openCreatorAI}>
          <Text style={s.secondaryText}>{c.ask}</Text>
        </Pressable>
      </View>

      <View style={s.metricsGrid}>
        <Metric value={projects.length} label={c.projects} />
        <Metric value={completedProjects} label={c.completed} />
        <Metric value={contentCount} label={c.published} />
        <Metric value={sampleCount} label={c.samples} />
      </View>

      <SectionTitle title={c.pipeline} />
      {activeProjects.length ? (
        activeProjects.slice(0, 3).map((project) => (
          <Pressable key={project.id} style={s.pipelineCard} onPress={() => router.push(`/creator/${project.id}`)}>
            <View style={s.pipelineTop}>
              <Text numberOfLines={1} style={s.cardTitle}>{project.title}</Text>
              <Text style={s.status}>{project.status.replaceAll("_", " ").toUpperCase()}</Text>
            </View>
            <Text style={s.muted}>{project.aspectRatio} · {project.captionsEnabled ? "Captions ON" : "Captions OFF"}</Text>
            <Text style={s.link}>{c.openStudio} →</Text>
          </Pressable>
        ))
      ) : (
        <View style={s.softCard}>
          <Text style={s.muted}>{c.noPipeline}</Text>
        </View>
      )}

      <View style={s.intelligenceCard}>
        <Text style={s.eyebrow}>{c.nextMove}</Text>
        <Text style={s.cardTitle}>{nextMoveCopy}</Text>
        <View style={s.actionRow}>
          <Pressable style={s.inlineButton} onPress={() => router.push(move.href as never)}>
            <Text style={s.inlineButtonText}>{language === "en" ? "Continue" : "Continuar"}</Text>
          </Pressable>
          <Pressable
            style={s.textButton}
            onPress={() =>
              session?.user.id &&
              void createTask(session.user.id, {
                title: nextMoveCopy,
                description: "KIVRYN Creator Center — next creator action",
              })
            }
          >
            <Text style={s.link}>＋ {c.createTask}</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle title={c.loop} subtitle={c.loopCopy} />
      <View style={s.loopGrid}>
        <LoopCard title={c.create} copy={c.createCopy} onPress={() => router.push("/creator/new")} />
        <LoopCard title={c.publish} copy={c.publishCopy} onPress={() => router.push("/creator/library")} />
        <LoopCard title={c.measure} copy={c.measureCopy} onPress={() => router.push("/creator/analytics")} />
        <LoopCard title={c.improve} copy={c.improveCopy} onPress={() => router.push("/creator/map")} />
      </View>

      <View style={s.intelligenceCard}>
        <Text style={s.eyebrow}>{c.intelligence}</Text>
        <Text style={s.body}>{c.intelligenceCopy}</Text>
        <View style={s.signalRow}>
          <Text style={s.signal}>{sampleCount} {c.samples}</Text>
          <Text style={s.signal}>{connectedCount} {c.connected}</Text>
        </View>
        <Pressable style={s.secondary} onPress={() => router.push("/creator/map")}>
          <Text style={s.secondaryText}>{c.reviewIntelligence}</Text>
        </Pressable>
      </View>

      <SectionTitle title={c.tools} />
      <View style={s.toolsGrid}>
        <Tool label={c.studio} note="CLIPS" onPress={() => router.push("/creator/new")} />
        <Tool label={c.hooks} note="AI" onPress={() => router.push("/creator/hook-lab")} />
        <Tool label={c.analytics} note="DATA" onPress={() => router.push("/creator/analytics")} />
        <Tool label={c.library} note="MEDIA" onPress={() => router.push("/creator/library")} />
        <Tool label={c.strategy} note="SYSTEM" onPress={() => router.push("/creator/strategy")} />
        <Tool label={c.academy} note="LEARN" onPress={() => router.push("/creator/academy")} />
        <Tool label={c.profile} note="BRAND" onPress={() => router.push("/creator/profile")} />
        <Tool label={c.media} note="UPLOAD" onPress={() => router.push("/creator/import")} />
      </View>

      <View style={s.sectionHeaderRow}>
        <SectionTitle title={c.recent} />
        <Pressable disabled={refreshing} onPress={() => void refresh()}>
          <Text style={s.link}>{refreshing ? "…" : c.refresh}</Text>
        </Pressable>
      </View>
      {error ? <Text style={s.error}>{c.loadError}</Text> : null}
      {projects.length === 0 ? (
        <Pressable style={s.emptyCard} onPress={() => router.push("/creator/new")}>
          <Text style={s.cardTitle}>{c.empty}</Text>
          <Text style={s.link}>{c.start} →</Text>
        </Pressable>
      ) : (
        projects.slice(0, 6).map((project) => (
          <Pressable key={project.id} style={s.projectCard} onPress={() => router.push(`/creator/${project.id}`)}>
            <View style={s.pipelineTop}>
              <View style={s.flex}>
                <Text numberOfLines={1} style={s.cardTitle}>{project.title}</Text>
                <Text style={s.muted}>{new Date(project.createdAt).toLocaleDateString(language === "en" ? "en-US" : "pt-BR")}</Text>
              </View>
              <Text style={s.status}>{project.status.replaceAll("_", " ").toUpperCase()}</Text>
            </View>
          </Pressable>
        ))
      )}
    </AppScreen>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionTitleWrap}>
      <Text style={s.eyebrow}>{title}</Text>
      {subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}
    </View>
  );
}

function LoopCard({ title, copy: text, onPress }: { title: string; copy: string; onPress(): void }) {
  return (
    <Pressable style={s.loopCard} onPress={onPress}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.muted}>{text}</Text>
    </Pressable>
  );
}

function Tool({ label, note, onPress }: { label: string; note: string; onPress(): void }) {
  return (
    <Pressable style={s.toolCard} onPress={onPress}>
      <Text style={s.toolNote}>{note}</Text>
      <Text style={s.toolLabel}>{label}</Text>
      <Text style={s.toolArrow}>↗</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.canvasElevated,
    ...shadows.illuminated,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentMuted,
  },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
  liveText: { ...typography.caption, color: colors.textSecondary },
  display: { ...typography.title, color: colors.text },
  heroCopy: { ...typography.body, color: colors.textSecondary },
  primary: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  secondary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.label, color: colors.primaryBright },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: {
    width: "48%",
    minHeight: 94,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metricValue: { ...typography.title, color: colors.text },
  metricLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitleWrap: { gap: spacing.xs, flex: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  softCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pipelineCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  pipelineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  cardTitle: { ...typography.heading, color: colors.text },
  status: { ...typography.caption, color: colors.primaryBright, textAlign: "right", maxWidth: 120 },
  muted: { ...typography.body, color: colors.textMuted },
  body: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.label, color: colors.primaryBright },
  intelligenceCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
    ...shadows.raised,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  inlineButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  inlineButtonText: { ...typography.label, color: colors.text },
  textButton: { minHeight: 44, justifyContent: "center" },
  loopGrid: { gap: spacing.sm },
  loopCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  signal: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.canvasElevated,
  },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  toolCard: {
    width: "48%",
    minHeight: 122,
    justifyContent: "space-between",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolNote: { ...typography.eyebrow, color: colors.textMuted },
  toolLabel: { ...typography.heading, color: colors.text },
  toolArrow: { ...typography.heading, color: colors.primaryBright, alignSelf: "flex-end" },
  projectCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: colors.surface,
  },
  flex: { flex: 1, gap: spacing.xs },
  error: { ...typography.body, color: colors.danger },
});
