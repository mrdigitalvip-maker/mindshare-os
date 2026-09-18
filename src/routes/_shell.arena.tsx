import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { StatusChip, WorkspaceProgress, WorkspaceShell } from "@/components/workspace-ui";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";
import { getWebChallengeRanking } from "@/services/challenges-web-service";
import {
  joinArena,
  listArena,
  parityKeys,
  safeBackendError,
  type ArenaChallenge,
} from "@/services/parity-service";

export const Route = createFileRoute("/_shell/arena")({ component: Arena });

type ArenaState = "upcoming" | "open" | "active" | "completed" | "ended";

function resolveArenaState(challenge: ArenaChallenge, now = Date.now()): ArenaState {
  const start = new Date(challenge.starts_at).getTime();
  const end = new Date(challenge.ends_at).getTime();
  const progress = Math.min(Math.max(challenge.progress, 0), Math.max(challenge.target_value, 1));
  if (challenge.completed_at || progress >= challenge.target_value) return "completed";
  if (!challenge.active || now >= end) return "ended";
  if (now < start) return "upcoming";
  if (challenge.joined_at) return "active";
  return "open";
}

const copy = {
  "pt-BR": {
    title: "Arena",
    description: "Seu desempenho competitivo real dentro da KIVRYN.",
    eyebrow: "PERFORMANCE ARENA",
    hero: "Execução real. Progresso verificável.",
    heroCopy:
      "Participe de desafios canônicos, acompanhe Momentum verificado e compare evolução somente com membros que optaram pelo ranking.",
    live: "DESAFIOS AO VIVO",
    current: "Ativos agora",
    joined: "Participando",
    completed: "Concluídos",
    ranking: "RANKING SEMANAL",
    rankingCopy: "Apenas Momentum elegível e perfis com opt-in aparecem aqui.",
    yourRank: "Sua posição",
    yourScore: "Seu Momentum",
    optIn: "Seu ranking está desativado.",
    manageRanking: "Gerenciar em Challenges",
    emptyRanking: "Ainda não há Momentum público elegível nesta semana.",
    challenges: "DESAFIOS DA ARENA",
    history: "HISTÓRICO",
    noChallenges: "Nenhum desafio disponível agora.",
    noHistory: "Você ainda não possui histórico de participação.",
    progress: "Progresso verificado",
    reward: "Momentum",
    join: "Participar",
    joining: "Entrando…",
    open: "ABERTO",
    active: "ATIVO",
    upcoming: "EM BREVE",
    done: "CONCLUÍDO",
    ended: "ENCERRADO",
  },
  en: {
    title: "Arena",
    description: "Your real competitive performance inside KIVRYN.",
    eyebrow: "PERFORMANCE ARENA",
    hero: "Real execution. Verifiable progress.",
    heroCopy:
      "Join canonical challenges, track verified Momentum and compare progress only with members who opted into ranking.",
    live: "LIVE CHALLENGES",
    current: "Live now",
    joined: "Participating",
    completed: "Completed",
    ranking: "WEEKLY RANKING",
    rankingCopy: "Only eligible Momentum and opt-in Community profiles appear here.",
    yourRank: "Your rank",
    yourScore: "Your Momentum",
    optIn: "Your ranking is disabled.",
    manageRanking: "Manage in Challenges",
    emptyRanking: "There is no eligible public Momentum this week yet.",
    challenges: "ARENA CHALLENGES",
    history: "HISTORY",
    noChallenges: "No challenge is available right now.",
    noHistory: "You do not have participation history yet.",
    progress: "Verified progress",
    reward: "Momentum",
    join: "Join",
    joining: "Joining…",
    open: "OPEN",
    active: "ACTIVE",
    upcoming: "UPCOMING",
    done: "COMPLETED",
    ended: "ENDED",
  },
} as const;

function Arena() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const arena = useQuery({ queryKey: parityKeys.arena, queryFn: listArena });
  const ranking = useQuery({
    queryKey: ["arena-ranking", userId, "weekly"],
    queryFn: () => getWebChallengeRanking(userId, "weekly"),
    enabled: Boolean(userId),
  });

  const join = useMutation({
    mutationFn: joinArena,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: parityKeys.arena }),
        qc.invalidateQueries({ queryKey: ["arena-ranking", userId, "weekly"] }),
      ]);
      toast.success(resolvedLocale === "en" ? "Challenge joined." : "Desafio iniciado.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });

  const all = arena.data ?? [];
  const active = all.filter((item) => {
    const state = resolveArenaState(item);
    return state === "open" || state === "active" || state === "upcoming";
  });
  const history = all.filter((item) => {
    const state = resolveArenaState(item);
    return (state === "completed" || state === "ended") && Boolean(item.joined_at);
  });
  const participating = all.filter((item) => resolveArenaState(item) === "active").length;
  const completed = all.filter((item) => resolveArenaState(item) === "completed").length;

  return (
    <PageShell>
      <PageHeader title={text.title} description={text.description} />
      <WorkspaceShell>
        <RouteState
          loading={arena.isLoading}
          error={arena.isError}
          empty={false}
          onRetry={() => void arena.refetch()}
        >
          <div className="grid gap-5">
            <section className="relative overflow-hidden rounded-[2rem] border bg-card p-7">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="relative max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{text.eyebrow}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{text.hero}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{text.heroCopy}</p>
              </div>
              <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
                <Metric label={text.current} value={active.length} />
                <Metric label={text.joined} value={participating} />
                <Metric label={text.completed} value={completed} />
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <div>
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{text.live}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{text.challenges}</h2>
                </div>
                {!active.length ? (
                  <div className="v2-surface rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">
                    {text.noChallenges}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {active.map((challenge) => (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        joining={join.isPending && join.variables === challenge.id}
                        onJoin={() => join.mutate(challenge.id)}
                        text={text}
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside className="v2-surface h-fit rounded-3xl p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{text.ranking}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{text.rankingCopy}</p>
                  </div>
                  <StatusChip tone="active">LIVE</StatusChip>
                </div>
                {ranking.isLoading ? (
                  <p className="mt-5 text-sm text-muted-foreground">Sincronizando ranking…</p>
                ) : ranking.isError ? (
                  <p className="mt-5 text-sm text-destructive">Ranking indisponível agora.</p>
                ) : ranking.data ? (
                  <>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Metric
                        label={text.yourRank}
                        value={ranking.data.myRank ? `#${ranking.data.myRank}` : "—"}
                        compact
                      />
                      <Metric label={text.yourScore} value={ranking.data.myScore} compact />
                    </div>
                    {!ranking.data.optedIn ? (
                      <div className="mt-4 rounded-2xl border border-dashed p-4">
                        <p className="text-sm text-muted-foreground">{text.optIn}</p>
                        <Button className="mt-3" size="sm" variant="outline" asChild>
                          <Link to="/challenges">{text.manageRanking}</Link>
                        </Button>
                      </div>
                    ) : null}
                    <div className="mt-5 grid gap-2">
                      {!ranking.data.entries.length ? (
                        <p className="text-sm text-muted-foreground">{text.emptyRanking}</p>
                      ) : (
                        ranking.data.entries.slice(0, 8).map((entry) => (
                          <div
                            key={entry.memberId}
                            className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${entry.isSelf ? "border-primary/40 bg-primary/5" : "bg-background/30"}`}
                          >
                            <span className="w-8 text-sm font-semibold">#{entry.rank}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{entry.displayName}</p>
                              {entry.username ? (
                                <p className="truncate text-xs text-muted-foreground">@{entry.username}</p>
                              ) : null}
                            </div>
                            <span className="text-sm font-semibold">{entry.score}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : null}
              </aside>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{text.history}</p>
              {!history.length ? (
                <p className="mt-3 text-sm text-muted-foreground">{text.noHistory}</p>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {history.slice(0, 6).map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} joining={false} onJoin={() => undefined} text={text} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </RouteState>
      </WorkspaceShell>
    </PageShell>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-background/40 ${compact ? "p-3" : "p-4"}`}>
      <p className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChallengeCard({
  challenge,
  joining,
  onJoin,
  text,
}: {
  challenge: ArenaChallenge;
  joining: boolean;
  onJoin: () => void;
  text: (typeof copy)["pt-BR"] | (typeof copy)["en"];
}) {
  const state = resolveArenaState(challenge);
  const target = Math.max(1, challenge.target_value);
  const progress = Math.min(Math.max(challenge.progress, 0), target);
  const label =
    state === "completed"
      ? text.done
      : state === "ended"
        ? text.ended
        : state === "upcoming"
          ? text.upcoming
          : state === "active"
            ? text.active
            : text.open;
  const tone =
    state === "completed"
      ? "positive"
      : state === "active"
        ? "active"
        : state === "open"
          ? "positive"
          : "neutral";

  return (
    <article className="v2-surface rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold">{challenge.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>
        </div>
        <StatusChip tone={tone}>{label}</StatusChip>
      </div>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span>{text.progress}</span>
          <span className="font-medium">{progress} / {target}</span>
        </div>
        <WorkspaceProgress
          label={`${challenge.title} ${text.progress}`}
          value={(progress / target) * 100}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {new Date(challenge.starts_at).toLocaleDateString()} – {new Date(challenge.ends_at).toLocaleDateString()}
          <span className="mx-2">·</span>
          +{challenge.reward_points} {text.reward}
        </div>
        {state === "open" ? (
          <Button disabled={joining} onClick={onJoin}>
            {joining ? text.joining : text.join}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
