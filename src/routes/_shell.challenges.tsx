import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { StatusChip, WorkspaceProgress, WorkspaceShell } from "@/components/workspace-ui";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";
import {
  abandonWebPersonalChallenge,
  checkInWebPersonalChallenge,
  createWebPersonalChallenge,
  getWebChallengeRanking,
  listWebChallengeSuggestions,
  listWebPersonalChallenges,
  setWebChallengeRankingOptIn,
  type WebChallengeCategory,
  type WebChallengeMetric,
  type WebChallengePeriod,
} from "@/services/challenges-web-service";

export const Route = createFileRoute("/_shell/challenges")({ component: ChallengesWorkspace });

const copy = {
  "pt-BR": {
    title: "Challenges",
    description: "Desafios pessoais, sinais verificados e ranking de Momentum com privacidade.",
    suggested: "Desafio recomendado",
    accept: "Aceitar",
    replace: "Trocar sugestão",
    builder: "Criar desafio",
    name: "Nome do desafio",
    category: "Categoria",
    period: "Período",
    target: "Meta",
    create: "Criar",
    active: "Desafios ativos",
    completed: "Concluídos",
    empty: "Nenhum desafio ativo. Aceite uma sugestão ou crie o seu.",
    verified: "Verificado",
    self: "Autodeclarado",
    reward: "Momentum",
    checkin: "Confirmar hoje",
    abandon: "Encerrar",
    ranking: "Ranking",
    joinRanking: "Participar do ranking",
    leaveRanking: "Sair do ranking",
    yourRank: "Sua posição",
    noRanking: "Ainda não há Momentum público neste período.",
    daily: "Hoje",
    weekly: "Semana",
    monthly: "Mês",
    execution: "Execução",
    study: "Estudos",
    fitness: "Fitness",
    wellbeing: "Bem-estar",
    journey: "Jornadas",
    custom: "Pessoal",
    progress: "Progresso",
    loading: "Sincronizando Challenges…",
    retry: "Tentar novamente",
  },
  en: {
    title: "Challenges",
    description: "Personal challenges, verified signals and privacy-safe Momentum ranking.",
    suggested: "Recommended challenge",
    accept: "Accept",
    replace: "Replace suggestion",
    builder: "Create challenge",
    name: "Challenge name",
    category: "Category",
    period: "Period",
    target: "Target",
    create: "Create",
    active: "Active challenges",
    completed: "Completed",
    empty: "No active challenge. Accept a suggestion or create your own.",
    verified: "Verified",
    self: "Self-reported",
    reward: "Momentum",
    checkin: "Confirm today",
    abandon: "End",
    ranking: "Ranking",
    joinRanking: "Join ranking",
    leaveRanking: "Leave ranking",
    yourRank: "Your rank",
    noRanking: "There is no public Momentum for this period yet.",
    daily: "Today",
    weekly: "Week",
    monthly: "Month",
    execution: "Execution",
    study: "Study",
    fitness: "Fitness",
    wellbeing: "Wellbeing",
    journey: "Journeys",
    custom: "Personal",
    progress: "Progress",
    loading: "Synchronizing Challenges…",
    retry: "Try again",
  },
} as const;

const challengeKeys = {
  root: ["web-challenges"] as const,
  list: (userId: string) => ["web-challenges", "list", userId] as const,
  suggestions: (userId: string) => ["web-challenges", "suggestions", userId] as const,
  ranking: (userId: string, period: WebChallengePeriod) => ["web-challenges", "ranking", userId, period] as const,
};

const categories: WebChallengeCategory[] = ["execution", "study", "fitness", "wellbeing", "journey", "custom"];
const periods: WebChallengePeriod[] = ["daily", "weekly", "monthly"];
const metricForCategory = (category: WebChallengeCategory): WebChallengeMetric => {
  if (category === "execution") return "task_completions";
  if (category === "study") return "study_minutes";
  if (category === "journey") return "journey_missions";
  return "self_checkins";
};

function ChallengesWorkspace() {
  const { user } = useAuth();
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [rankingPeriod, setRankingPeriod] = useState<WebChallengePeriod>("weekly");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WebChallengeCategory>("execution");
  const [period, setPeriod] = useState<WebChallengePeriod>("weekly");
  const [target, setTarget] = useState(3);

  const challenges = useQuery({
    queryKey: challengeKeys.list(userId),
    queryFn: () => listWebPersonalChallenges(userId),
    enabled: Boolean(userId),
  });
  const suggestions = useQuery({
    queryKey: challengeKeys.suggestions(userId),
    queryFn: () => listWebChallengeSuggestions(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
  const ranking = useQuery({
    queryKey: challengeKeys.ranking(userId, rankingPeriod),
    queryFn: () => getWebChallengeRanking(userId, rankingPeriod),
    enabled: Boolean(userId),
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: challengeKeys.root });
  };
  const create = useMutation({
    mutationFn: createWebPersonalChallenge.bind(null, userId),
    onSuccess: async () => {
      setTitle("");
      await invalidate();
      toast.success(resolvedLocale === "en" ? "Challenge created." : "Desafio criado.");
    },
    onError: () => toast.error(resolvedLocale === "en" ? "Challenge could not be created." : "Não foi possível criar o desafio."),
  });
  const checkIn = useMutation({
    mutationFn: (id: string) => checkInWebPersonalChallenge(userId, id),
    onSuccess: invalidate,
    onError: () => toast.error(resolvedLocale === "en" ? "Check-in could not be saved." : "Não foi possível salvar o check-in."),
  });
  const abandon = useMutation({
    mutationFn: (id: string) => abandonWebPersonalChallenge(userId, id),
    onSuccess: invalidate,
  });
  const rankingOptIn = useMutation({
    mutationFn: (enabled: boolean) => setWebChallengeRankingOptIn(userId, enabled),
    onSuccess: invalidate,
    onError: () => toast.error(resolvedLocale === "en" ? "Ranking preference could not be updated." : "Não foi possível atualizar sua preferência de ranking."),
  });

  const all = challenges.data ?? [];
  const active = all.filter((item) => item.status === "active");
  const completed = all.filter((item) => item.status === "completed");
  const suggestionList = suggestions.data ?? [];
  const suggestion = suggestionList.length
    ? suggestionList[suggestionIndex % suggestionList.length]
    : null;
  const metric = metricForCategory(category);
  const targetStep = metric === "study_minutes" ? 15 : 1;
  const activeProgress = useMemo(
    () => active.reduce((sum, item) => sum + Math.min(item.progress, item.targetValue), 0),
    [active],
  );

  if (!userId) return null;

  return (
    <PageShell>
      <PageHeader title={text.title} description={text.description} />
      <WorkspaceShell>
        <RouteState
          loading={challenges.isLoading || suggestions.isLoading}
          error={challenges.isError || suggestions.isError}
          empty={false}
          onRetry={() => {
            void challenges.refetch();
            void suggestions.refetch();
          }}
        >
          <div className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard label={text.active} value={active.length} />
              <MetricCard label={text.completed} value={completed.length} />
              <MetricCard label={text.progress} value={activeProgress} />
            </section>

            {suggestion ? (
              <section className="v2-surface rounded-3xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{text.suggested}</p>
                    <h2 className="mt-2 text-2xl font-semibold">{suggestion.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{suggestion.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{text[suggestion.category]}</span><span>·</span><span>{text[suggestion.period]}</span><span>·</span><span>{suggestion.evidenceMode === "verified" ? text.verified : text.self}</span><span>·</span><span>+{suggestion.rewardPoints} {text.reward}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        create.mutate({
                          title: suggestion.title,
                          description: suggestion.description,
                          category: suggestion.category,
                          period: suggestion.period,
                          metric: suggestion.metric,
                          targetValue: suggestion.targetValue,
                          source: "suggestion",
                        })
                      }
                    >
                      {text.accept}
                    </Button>
                    {suggestionList.length > 1 ? <Button variant="outline" onClick={() => setSuggestionIndex((value) => value + 1)}>{text.replace}</Button> : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="v2-surface rounded-3xl p-6">
              <h2 className="text-xl font-semibold">{text.builder}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <label className="grid gap-2 text-sm md:col-span-2"><span className="text-muted-foreground">{text.name}</span><input className="rounded-xl border border-border bg-background px-3 py-3" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="grid gap-2 text-sm"><span className="text-muted-foreground">{text.category}</span><select className="rounded-xl border border-border bg-background px-3 py-3" value={category} onChange={(e) => setCategory(e.target.value as WebChallengeCategory)}>{categories.map((item) => <option key={item} value={item}>{text[item]}</option>)}</select></label>
                <label className="grid gap-2 text-sm"><span className="text-muted-foreground">{text.period}</span><select className="rounded-xl border border-border bg-background px-3 py-3" value={period} onChange={(e) => setPeriod(e.target.value as WebChallengePeriod)}>{periods.map((item) => <option key={item} value={item}>{text[item]}</option>)}</select></label>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3"><label className="grid gap-2 text-sm"><span className="text-muted-foreground">{text.target}</span><input type="number" min={1} step={targetStep} className="w-32 rounded-xl border border-border bg-background px-3 py-3" value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))} /></label><Button disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ title: title.trim(), category, period, metric, targetValue: target, source: "manual" })}>{text.create}</Button></div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">{text.active}</h2>
              {!active.length ? <p className="mt-3 text-sm text-muted-foreground">{text.empty}</p> : null}
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {active.map((challenge) => {
                  const ratio = challenge.targetValue > 0 ? Math.min(100, (challenge.progress / challenge.targetValue) * 100) : 0;
                  return (
                    <article key={challenge.id} className="v2-surface rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{challenge.title}</h3><p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p></div><StatusChip tone={challenge.evidenceMode === "verified" ? "positive" : "neutral"}>{challenge.evidenceMode === "verified" ? text.verified : text.self}</StatusChip></div>
                      <div className="mt-4"><WorkspaceProgress label={`${challenge.title} ${text.progress}`} value={ratio} /></div>
                      <div className="mt-2 flex justify-between text-sm"><span>{challenge.progress} / {challenge.targetValue}</span><span>+{challenge.rewardPoints} {text.reward}</span></div>
                      <div className="mt-4 flex gap-2">{challenge.evidenceMode === "self_reported" ? <Button size="sm" disabled={checkIn.isPending} onClick={() => checkIn.mutate(challenge.id)}>{text.checkin}</Button> : null}<Button size="sm" variant="outline" disabled={abandon.isPending} onClick={() => abandon.mutate(challenge.id)}>{text.abandon}</Button></div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="v2-surface rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{text.ranking}</h2>{ranking.data?.myRank ? <p className="mt-1 text-sm text-muted-foreground">{text.yourRank}: #{ranking.data.myRank} · {ranking.data.myScore} Momentum</p> : null}</div><Button variant="outline" disabled={rankingOptIn.isPending || ranking.isLoading} onClick={() => rankingOptIn.mutate(!(ranking.data?.optedIn ?? false))}>{ranking.data?.optedIn ? text.leaveRanking : text.joinRanking}</Button></div>
              <div className="mt-4 flex gap-2">{periods.map((item) => <Button key={item} size="sm" variant={rankingPeriod === item ? "default" : "outline"} onClick={() => setRankingPeriod(item)}>{text[item]}</Button>)}</div>
              {ranking.isError ? <div className="mt-4"><Button variant="outline" onClick={() => void ranking.refetch()}>{text.retry}</Button></div> : null}
              {!ranking.isLoading && !ranking.data?.entries.length ? <p className="mt-4 text-sm text-muted-foreground">{text.noRanking}</p> : null}
              <div className="mt-4 divide-y divide-border">{ranking.data?.entries.map((entry) => <div key={entry.memberId} className="flex items-center justify-between py-3"><div className="flex items-center gap-3"><span className="w-8 text-sm text-muted-foreground">#{entry.rank}</span><div><p className="font-medium">{entry.displayName}</p>{entry.username ? <p className="text-xs text-muted-foreground">@{entry.username}</p> : null}</div></div><strong>{entry.score}</strong></div>)}</div>
            </section>
          </div>
        </RouteState>
      </WorkspaceShell>
    </PageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <article className="v2-surface rounded-2xl p-5"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></article>;
}
