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
import { radius, spacing, typography } from "@/lib/theme";

const C = {
  canvas: "#05070B",
  panel: "#0B0F17",
  panelRaised: "#111722",
  cyan: "#4CE8FF",
  pink: "#FF5FCF",
  orange: "#FF9E57",
  violet: "#8B76FF",
  lime: "#91F7A3",
  text: "#F7F8FC",
  muted: "#8994A6",
  border: "#202A39",
  danger: "#FF6E79",
};

const copy = {
  "pt-BR": {
    eyebrow: "CREATOR OPERATING CENTER",
    title: "Crie. Meça. Aprenda. Evolua.",
    subtitle:
      "Um estúdio avançado para transformar ideias, vídeos e sinais reais em um sistema de conteúdo.",
    systemLive: "Creator OS ativo",
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
    loopCopy: "Criação, distribuição, leitura de sinais e melhoria contínua.",
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
    signalBoard: "SIGNAL BOARD",
    signalCopy: "Um retrato visual dos sinais que já existem no seu sistema.",
    studioMode: "STUDIO MODE",
    liveData: "dados reais",
  },
  en: {
    eyebrow: "CREATOR OPERATING CENTER",
    title: "Create. Measure. Learn. Evolve.",
    subtitle:
      "An advanced studio that turns ideas, videos and real signals into a content system.",
    systemLive: "Creator OS active",
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
    loopCopy: "Creation, distribution, signal reading and continuous improvement.",
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
    signalBoard: "SIGNAL BOARD",
    signalCopy: "A visual snapshot of the signals already living in your system.",
    studioMode: "STUDIO MODE",
    liveData: "real data",
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

  const signalValues = [projects.length, completedProjects, contentCount, sampleCount];
  const maxSignal = Math.max(1, ...signalValues);

  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <View style={s.hero}>
        <View pointerEvents="none" style={s.heroOrbPink} />
        <View pointerEvents="none" style={s.heroOrbCyan} />
        <View style={s.heroTop}>
          <View>
            <Text style={s.eyebrow}>{c.eyebrow}</Text>
            <Text style={s.mode}>{c.studioMode}</Text>
          </View>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>{c.systemLive}</Text>
          </View>
        </View>
        <Text style={s.display}>{c.title}</Text>
        <Text style={s.heroCopy}>{c.subtitle}</Text>
        <View style={s.heroActions}>
          <Pressable style={s.primary} onPress={() => router.push("/creator/new")}>
            <Text style={s.primaryText}>{c.start}</Text>
          </Pressable>
          <Pressable style={s.secondary} onPress={openCreatorAI}>
            <Text style={s.secondaryText}>{c.ask}</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.signalBoard}>
        <View style={s.signalHeader}>
          <View style={s.flex}>
            <Text style={s.eyebrow}>{c.signalBoard}</Text>
            <Text style={s.signalTitle}>{c.signalCopy}</Text>
          </View>
          <Text style={s.realData}>{c.liveData}</Text>
        </View>
        <View style={s.chart}>
          <SignalBar tone={C.cyan} value={projects.length} max={maxSignal} label={c.projects} />
          <SignalBar tone={C.pink} value={completedProjects} max={maxSignal} label={c.completed} />
          <SignalBar tone={C.orange} value={contentCount} max={maxSignal} label={c.published} />
          <SignalBar tone={C.lime} value={sampleCount} max={maxSignal} label={c.samples} />
        </View>
      </View>

      <View style={s.metricsGrid}>
        <Metric tone={C.cyan} value={projects.length} label={c.projects} />
        <Metric tone={C.pink} value={completedProjects} label={c.completed} />
        <Metric tone={C.orange} value={contentCount} label={c.published} />
        <Metric tone={C.lime} value={sampleCount} label={c.samples} />
      </View>

      <SectionTitle title={c.pipeline} />
      {activeProjects.length ? (
        activeProjects.slice(0, 3).map((project, index) => (
          <Pressable
            key={project.id}
            style={[s.pipelineCard, { borderColor: index % 2 ? "#633D68" : "#24536A" }]}
            onPress={() => router.push(`/creator/${project.id}`)}
          >
            <View style={s.pipelineTop}>
              <View style={s.flex}>
                <Text numberOfLines={1} style={s.cardTitle}>{project.title}</Text>
                <Text style={s.muted}>{project.aspectRatio} · {project.captionsEnabled ? "Captions ON" : "Captions OFF"}</Text>
              </View>
              <Text style={s.status}>{project.status.replaceAll("_", " ").toUpperCase()}</Text>
            </View>
            <View style={s.pipelineMeter}><View style={s.pipelineMeterFill} /></View>
            <Text style={s.link}>{c.openStudio} →</Text>
          </Pressable>
        ))
      ) : (
        <View style={s.softCard}>
          <View style={s.softSignal} />
          <Text style={s.muted}>{c.noPipeline}</Text>
        </View>
      )}

      <View style={s.intelligenceCard}>
        <View pointerEvents="none" style={s.intelligenceGlow} />
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
        <LoopCard tone={C.cyan} title={c.create} copy={c.createCopy} onPress={() => router.push("/creator/new")} />
        <LoopCard tone={C.pink} title={c.publish} copy={c.publishCopy} onPress={() => router.push("/creator/library")} />
        <LoopCard tone={C.orange} title={c.measure} copy={c.measureCopy} onPress={() => router.push("/creator/analytics")} />
        <LoopCard tone={C.lime} title={c.improve} copy={c.improveCopy} onPress={() => router.push("/creator/map")} />
      </View>

      <View style={s.intelligenceCard}>
        <Text style={s.eyebrow}>{c.intelligence}</Text>
        <Text style={s.body}>{c.intelligenceCopy}</Text>
        <View style={s.signalRow}>
          <Text style={[s.signal, { borderColor: "#4B385F" }]}>{sampleCount} {c.samples}</Text>
          <Text style={[s.signal, { borderColor: "#244C55" }]}>{connectedCount} {c.connected}</Text>
        </View>
        <Pressable style={s.secondary} onPress={() => router.push("/creator/map")}>
          <Text style={s.secondaryText}>{c.reviewIntelligence}</Text>
        </Pressable>
      </View>

      <SectionTitle title={c.tools} />
      <View style={s.toolsGrid}>
        <Tool tone={C.cyan} label={c.studio} note="CLIPS" onPress={() => router.push("/creator/new")} />
        <Tool tone={C.pink} label={c.hooks} note="AI" onPress={() => router.push("/creator/hook-lab")} />
        <Tool tone={C.orange} label={c.analytics} note="DATA" onPress={() => router.push("/creator/analytics")} />
        <Tool tone={C.violet} label={c.library} note="MEDIA" onPress={() => router.push("/creator/library")} />
        <Tool tone={C.lime} label={c.strategy} note="SYSTEM" onPress={() => router.push("/creator/strategy")} />
        <Tool tone={C.cyan} label={c.academy} note="LEARN" onPress={() => router.push("/creator/academy")} />
        <Tool tone={C.pink} label={c.profile} note="BRAND" onPress={() => router.push("/creator/profile")} />
        <Tool tone={C.orange} label={c.media} note="UPLOAD" onPress={() => router.push("/creator/import")} />
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

function SignalBar({ tone, value, max, label }: { tone: string; value: number; max: number; label: string }) {
  const height = 24 + Math.round((value / max) * 62);
  return (
    <View style={s.signalBarColumn}>
      <Text style={[s.signalBarValue, { color: tone }]}>{value}</Text>
      <View style={s.signalBarTrack}>
        <View style={[s.signalBarFill, { height, backgroundColor: tone }]} />
      </View>
      <Text numberOfLines={1} style={s.signalBarLabel}>{label}</Text>
    </View>
  );
}

function Metric({ tone, value, label }: { tone: string; value: number; label: string }) {
  return (
    <View style={[s.metricCard, { borderColor: `${tone}55` }]}>
      <View style={[s.metricMarker, { backgroundColor: tone }]} />
      <Text style={[s.metricValue, { color: tone }]}>{value}</Text>
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

function LoopCard({ tone, title, copy: text, onPress }: { tone: string; title: string; copy: string; onPress(): void }) {
  return (
    <Pressable style={[s.loopCard, { borderColor: `${tone}55` }]} onPress={onPress}>
      <View style={[s.loopLine, { backgroundColor: tone }]} />
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.muted}>{text}</Text>
    </Pressable>
  );
}

function Tool({ tone, label, note, onPress }: { tone: string; label: string; note: string; onPress(): void }) {
  return (
    <Pressable style={[s.toolCard, { borderColor: `${tone}55` }]} onPress={onPress}>
      <View style={[s.toolOrb, { backgroundColor: `${tone}22` }]}>
        <Text style={[s.toolOrbText, { color: tone }]}>{note.slice(0, 1)}</Text>
      </View>
      <Text style={[s.toolNote, { color: tone }]}>{note}</Text>
      <Text style={s.toolLabel}>{label}</Text>
      <Text style={[s.toolArrow, { color: tone }]}>↗</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  page: { gap: spacing.lg, paddingBottom: spacing.xxl, backgroundColor: C.canvas },
  hero: {
    overflow: "hidden",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#28334B",
    backgroundColor: "#0C111B",
  },
  heroOrbPink: { position: "absolute", width: 250, height: 250, borderRadius: 250, right: -90, top: -110, backgroundColor: "#7B1D63", opacity: 0.35 },
  heroOrbCyan: { position: "absolute", width: 210, height: 210, borderRadius: 210, left: -120, bottom: -130, backgroundColor: "#0D6574", opacity: 0.3 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  eyebrow: { ...typography.eyebrow, color: C.cyan },
  mode: { ...typography.caption, color: C.pink, marginTop: 4, letterSpacing: 1.4 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: "#111A18", borderWidth: 1, borderColor: "#22473B" },
  liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: C.lime },
  liveText: { ...typography.caption, color: "#BDEBC7" },
  display: { ...typography.title, color: C.text, fontSize: 34, lineHeight: 39 },
  heroCopy: { ...typography.body, color: "#ABB5C6" },
  heroActions: { gap: spacing.sm, marginTop: spacing.xs },
  primary: { minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: C.cyan },
  primaryText: { ...typography.label, color: "#041014", fontWeight: "900" },
  secondary: { minHeight: 49, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: "#493B63", backgroundColor: "#11111A" },
  secondaryText: { ...typography.label, color: "#D8C7FF" },
  signalBoard: { padding: spacing.lg, borderRadius: 28, backgroundColor: "#090D14", borderWidth: 1, borderColor: "#273247" },
  signalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  signalTitle: { ...typography.body, color: C.muted, marginTop: spacing.xs },
  realData: { ...typography.caption, color: C.lime, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: "#102019" },
  chart: { height: 150, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", gap: spacing.sm, marginTop: spacing.lg },
  signalBarColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  signalBarValue: { ...typography.label, marginBottom: 5 },
  signalBarTrack: { width: 30, height: 92, borderRadius: 10, overflow: "hidden", justifyContent: "flex-end", backgroundColor: "#121926" },
  signalBarFill: { width: "100%", borderRadius: 10 },
  signalBarLabel: { ...typography.caption, color: C.muted, marginTop: 7, maxWidth: 70 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { width: "48%", minHeight: 105, padding: spacing.md, borderRadius: 22, borderWidth: 1, backgroundColor: C.panel },
  metricMarker: { width: 28, height: 4, borderRadius: 4, marginBottom: spacing.md },
  metricValue: { ...typography.title },
  metricLabel: { ...typography.caption, color: C.muted, marginTop: spacing.xs },
  sectionTitleWrap: { gap: spacing.xs, flex: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  softCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel },
  softSignal: { width: 10, height: 10, borderRadius: 10, backgroundColor: C.orange },
  pipelineCard: { gap: spacing.sm, padding: spacing.md, borderRadius: 22, borderWidth: 1, backgroundColor: C.panel },
  pipelineTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  pipelineMeter: { height: 4, overflow: "hidden", borderRadius: 4, backgroundColor: "#192130" },
  pipelineMeterFill: { width: "68%", height: "100%", borderRadius: 4, backgroundColor: C.cyan },
  cardTitle: { ...typography.heading, color: C.text },
  status: { ...typography.caption, color: C.pink, textAlign: "right", maxWidth: 120 },
  muted: { ...typography.body, color: C.muted },
  body: { ...typography.body, color: "#B7C0CF" },
  link: { ...typography.label, color: C.cyan },
  intelligenceCard: { overflow: "hidden", gap: spacing.md, padding: spacing.lg, borderRadius: 26, borderWidth: 1, borderColor: "#47385F", backgroundColor: C.panelRaised },
  intelligenceGlow: { position: "absolute", right: -80, top: -100, width: 200, height: 200, borderRadius: 200, backgroundColor: "#602D78", opacity: 0.22 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  inlineButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: C.pink },
  inlineButtonText: { ...typography.label, color: "#16050F" },
  textButton: { minHeight: 44, justifyContent: "center" },
  loopGrid: { gap: spacing.sm },
  loopCard: { gap: spacing.sm, padding: spacing.md, borderRadius: 22, borderWidth: 1, backgroundColor: C.panel },
  loopLine: { width: 42, height: 4, borderRadius: 4 },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  signal: { ...typography.caption, color: "#C2CAD7", paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: "#0A0E15", borderWidth: 1 },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  toolCard: { width: "48%", minHeight: 150, padding: spacing.md, borderRadius: 24, borderWidth: 1, backgroundColor: C.panel, position: "relative" },
  toolOrb: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  toolOrbText: { fontSize: 18, fontWeight: "900" },
  toolNote: { ...typography.eyebrow, marginTop: spacing.md },
  toolLabel: { ...typography.heading, color: C.text, marginTop: 3, paddingRight: 22 },
  toolArrow: { position: "absolute", right: spacing.md, bottom: spacing.md, ...typography.heading },
  projectCard: { padding: spacing.md, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel },
  emptyCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: 24, borderWidth: 1, borderColor: "#2D5262", backgroundColor: C.panel },
  flex: { flex: 1, gap: spacing.xs },
  error: { ...typography.body, color: C.danger },
});
