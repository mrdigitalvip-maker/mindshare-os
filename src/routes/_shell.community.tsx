import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { useLanguage } from "@/providers/language-provider";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptInvite,
  communityHome,
  createSquad,
  joinOfficialCommunity,
  listOfficialCommunities,
  parityKeys,
  react,
  reportTarget,
  safeBackendError,
  saveCommunityProfile,
  isCommunityProfileReady,
  setBlock,
  type CommunityProfile,
  type Reaction,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/community")({ component: Community });
function Community() {
  const { t } = useLanguage();
  const qc = useQueryClient(),
    nav = useNavigate(),
    q = useQuery({ queryKey: parityKeys.community, queryFn: communityHome }),
    channels = useQuery({
      queryKey: parityKeys.communityChannels,
      queryFn: listOfficialCommunities,
    });
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const profileReady = isCommunityProfileReady(profile);
  useEffect(() => {
    if (q.data?.profile) setProfile(q.data.profile);
  }, [q.data?.profile]);
  const refresh = () => qc.invalidateQueries({ queryKey: parityKeys.community });
  const useCommunityMutation = <T,>(fn: (v: T) => Promise<unknown>, success: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: async () => {
        await refresh();
        toast.success(success);
      },
      onError: (e) => toast.error(safeBackendError(e)),
    });
  const save = useCommunityMutation<CommunityProfile>(saveCommunityProfile, "Perfil atualizado.");
  const create = useMutation({
    mutationFn: (v: { name: string; description: string }) => createSquad(v.name, v.description),
    onSuccess: async (id) => {
      await refresh();
      toast.success("Squad criado.");
      await nav({ to: "/community/squads/$squadId", params: { squadId: id } });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  const accept = useMutation({
    mutationFn: acceptInvite,
    onSuccess: async (id) => {
      await refresh();
      toast.success("Convite aceito.");
      await nav({ to: "/community/squads/$squadId", params: { squadId: id } });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  const joinChannel = useMutation({
    mutationFn: joinOfficialCommunity,
    onSuccess: async (_, id) => {
      await qc.invalidateQueries({ queryKey: parityKeys.communityChannels });
      toast.success("Comunidade aberta.");
      await nav({ to: "/community/$channelId", params: { channelId: id } });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  const reaction = useCommunityMutation<{ id: string; value: Reaction | null }>(
    (v) => react(v.id, v.value),
    "Reação atualizada.",
  );
  function squadSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({ name: String(f.get("name")), description: String(f.get("description")) });
  }
  function inviteSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    accept.mutate(String(new FormData(e.currentTarget).get("code")));
  }
  return (
    <PageShell>
      <PageHeader title={t("page.community.title")} description={t("page.community.description")} />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={false}
        onRetry={() => void q.refetch()}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {profile ? (
            <form
              className="v2-surface rounded-2xl p-5 grid gap-3"
              aria-label="Perfil da comunidade"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(profile);
              }}
            >
              <h2 className="text-xl font-semibold">Seu perfil</h2>
              <label htmlFor="community-name">Nome de exibição</label>
              <Input
                id="community-name"
                maxLength={60}
                value={profile.display_name || ""}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
              />
              <label htmlFor="community-username">Nome de usuário</label>
              <Input
                id="community-username"
                pattern="[a-z][a-z0-9_]{2,29}"
                value={profile.username || ""}
                onChange={(e) => setProfile({ ...profile, username: e.target.value.toLowerCase() })}
              />
              <label htmlFor="community-bio">Bio</label>
              <Textarea
                id="community-bio"
                maxLength={240}
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
              <label htmlFor="community-visibility">Visibilidade</label>
              <select
                id="community-visibility"
                className="h-10 rounded-md border bg-background px-3"
                value={profile.visibility}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    visibility: e.target.value as CommunityProfile["visibility"],
                  })
                }
              >
                <option value="private">Privado</option>
                <option value="community">Comunidade</option>
              </select>
              {[
                ["show_momentum", "Mostrar Momentum"],
                ["show_verified_activity", "Mostrar atividade verificada"],
              ].map(([key, label]) => (
                <label className="flex items-center gap-2" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(profile[key as keyof CommunityProfile])}
                    onChange={(e) => setProfile({ ...profile, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
              <Button type="submit" disabled={save.isPending}>
                Salvar perfil
              </Button>
            </form>
          ) : (
            <section className="v2-surface rounded-2xl p-5">
              <h2 className="text-xl font-semibold">Seu perfil</h2>
              <p className="my-3 text-sm text-muted-foreground">
                Crie seu perfil da Comunidade para começar.
              </p>
              <Button
                onClick={() =>
                  setProfile({
                    display_name: null,
                    username: null,
                    bio: null,
                    visibility: "community",
                    show_momentum: false,
                    show_streak: false,
                    show_verified_activity: false,
                  })
                }
              >
                Configurar perfil
              </Button>
            </section>
          )}
          <div className="space-y-5">
            {!profileReady ? (
              <section className="v2-surface rounded-2xl p-5">
                <h2 className="text-xl font-semibold">Squads bloqueados até concluir seu perfil</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Configure nome, @username e visibilidade Comunidade para criar ou aceitar convites.
                </p>
              </section>
            ) : (
              <>
            <form
              onSubmit={squadSubmit}
              className="v2-surface rounded-2xl p-5 grid gap-3"
              aria-label="Criar Squad"
            >
              <h2 className="text-xl font-semibold">Criar Squad</h2>
              <label htmlFor="squad-name">Nome</label>
              <Input id="squad-name" name="name" required minLength={2} maxLength={60} />
              <label htmlFor="squad-description">Descrição</label>
              <Textarea id="squad-description" name="description" maxLength={240} />
              <Button type="submit" disabled={create.isPending}>
                Criar Squad
              </Button>
            </form>
            <form
              onSubmit={inviteSubmit}
              className="v2-surface rounded-2xl p-5 grid gap-3"
              aria-label="Aceitar convite"
            >
              <h2 className="text-xl font-semibold">Aceitar convite</h2>
              <label htmlFor="invite-code">Código</label>
              <Input
                id="invite-code"
                name="code"
                required
                maxLength={32}
                autoCapitalize="characters"
              />
              <Button type="submit" disabled={accept.isPending}>
                Entrar no Squad
              </Button>
            </form>
              </>
            )}
          </div>
        </div>
        {profileReady ? (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  KIVRYN COMMUNITY
                </p>
                <h2 className="mt-1 text-xl font-semibold">Comunidades oficiais</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Seu plano define quais espaços aparecem aqui. Usuários Free veem somente a comunidade Free.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void channels.refetch()}
                disabled={channels.isFetching}
              >
                Atualizar
              </Button>
            </div>
            {channels.isError ? (
              <p className="mt-4 text-sm text-destructive">
                Não foi possível sincronizar as comunidades oficiais.
              </p>
            ) : channels.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Sincronizando comunidades…</p>
            ) : !channels.data?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhuma comunidade disponível para seu plano.</p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {channels.data.map((channel) => (
                  <article
                    key={channel.id}
                    className={`v2-surface rounded-3xl border p-5 ${channel.premium ? "border-violet-500/40" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {channel.premium ? "Premium" : "Free"}
                        </span>
                        <h3 className="mt-1 text-lg font-semibold">{channel.name}</h3>
                      </div>
                      <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                        {channel.member_count} membros
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{channel.description}</p>
                    {channel.joined && channel.recent_body ? (
                      <div className="mt-4 rounded-2xl border bg-background/40 p-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Última conversa</p>
                        <p className="mt-1 line-clamp-2 text-sm">{channel.recent_body}</p>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {channel.unread_count > 0 ? (
                        <span className="text-xs font-medium">{channel.unread_count} não lidas</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {channel.joined ? "Em dia" : "Entre para conversar"}
                        </span>
                      )}
                      {channel.joined ? (
                        <Button asChild>
                          <Link to="/community/$channelId" params={{ channelId: channel.id }}>
                            Abrir conversa
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          disabled={joinChannel.isPending}
                          onClick={() => joinChannel.mutate(channel.id)}
                        >
                          Entrar
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Seus Squads</h2>
          {!profileReady ? (
            <p className="mt-3 text-muted-foreground">
              Conclua seu perfil da Comunidade para acessar Squads.
            </p>
          ) : !q.data?.squads.length ? (
            <p className="mt-3 text-muted-foreground">Você ainda não participa de um Squad.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {q.data.squads.map((s) => (
                <article key={s.id} className="v2-surface rounded-2xl p-5">
                  <h3 className="font-medium">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {s.member_count} de {s.max_members} membros · {s.role}
                  </p>
                  <Link
                    className="mt-3 inline-block underline"
                    to="/community/squads/$squadId"
                    params={{ squadId: s.id }}
                  >
                    Abrir Squad
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
        {profileReady ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Atividade verificada</h2>
          {!q.data?.activity.length ? (
            <p className="mt-3 text-muted-foreground">Nenhuma atividade visível.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {q.data.activity.map((a) => (
                <article key={a.id} className="v2-surface rounded-2xl p-4">
                  <p>{a.display_name}</p>
                  <p className="text-sm text-muted-foreground">{a.event_type.replace("_", " ")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["support", "celebrate", "respect"] as Reaction[]).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={a.my_reaction === r ? "default" : "outline"}
                        disabled={reaction.isPending}
                        onClick={() =>
                          reaction.mutate({ id: a.id, value: a.my_reaction === r ? null : r })
                        }
                      >
                        {r} {a.reactions[r] || 0}
                      </Button>
                    ))}
                    <ReportButton
                      onReport={(reason, details) =>
                        reportTarget("activity", a.id, reason, details)
                      }
                    />
                    {a.actor_user_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setBlock(a.actor_user_id, true)
                            .then(refresh)
                            .catch((e) => toast.error(safeBackendError(e)))
                        }
                      >
                        Bloquear
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        ) : null}
      </RouteState>
    </PageShell>
  );
}
function ReportButton({
  onReport,
}: {
  onReport: (reason: string, details: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false);
  return open ? (
    <form
      className="flex w-full flex-wrap gap-2 pt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const f = new FormData(e.currentTarget);
        try {
          await onReport(String(f.get("reason")), String(f.get("details")));
          toast.success("Denúncia enviada para análise.");
          setOpen(false);
        } catch (err) {
          toast.error(safeBackendError(err));
        } finally {
          setPending(false);
        }
      }}
    >
      <select
        name="reason"
        aria-label="Motivo da denúncia"
        className="rounded-md border bg-background px-2"
      >
        <option value="spam">Spam</option>
        <option value="harassment">Assédio</option>
        <option value="inappropriate">Inadequado</option>
        <option value="impersonation">Falsidade</option>
        <option value="other">Outro</option>
      </select>
      <Input
        name="details"
        aria-label="Detalhes opcionais"
        maxLength={500}
        className="min-w-48 flex-1"
      />
      <Button size="sm" disabled={pending}>
        Enviar
      </Button>
    </form>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
      Denunciar
    </Button>
  );
}
