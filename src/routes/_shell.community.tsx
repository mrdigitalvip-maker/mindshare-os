import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptInvite,
  communityHome,
  createSquad,
  parityKeys,
  react,
  reportTarget,
  safeBackendError,
  saveCommunityProfile,
  setBlock,
  type CommunityProfile,
  type Reaction,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/community")({ component: Community });
function Community() {
  const qc = useQueryClient(),
    nav = useNavigate(),
    q = useQuery({ queryKey: parityKeys.community, queryFn: communityHome });
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
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
  const create = useCommunityMutation<{ name: string; description: string }>(
    (v) => createSquad(v.name, v.description),
    "Squad criado.",
  );
  const accept = useMutation({
    mutationFn: acceptInvite,
    onSuccess: async (id) => {
      await refresh();
      toast.success("Convite aceito.");
      await nav({ to: "/community/squads/$squadId", params: { squadId: id } });
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
      <PageHeader
        title="Comunidade"
        description="Squads privados e atividade verificada, com controles de privacidade."
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={false}
        onRetry={() => void q.refetch()}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          {profile ? (
            <form
              className="grid gap-3 rounded-xl border p-5"
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
                ["show_streak", "Mostrar sequência"],
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
            <section className="rounded-xl border p-5">
              <h2 className="text-xl font-semibold">Seu perfil</h2>
              <p className="my-3 text-sm text-muted-foreground">
                Crie seu perfil privado para começar.
              </p>
              <Button
                onClick={() =>
                  setProfile({
                    display_name: null,
                    username: null,
                    bio: null,
                    visibility: "private",
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
            <form
              onSubmit={squadSubmit}
              className="grid gap-3 rounded-xl border p-5"
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
              className="grid gap-3 rounded-xl border p-5"
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
          </div>
        </div>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Seus Squads</h2>
          {!q.data?.squads.length ? (
            <p className="mt-3 text-muted-foreground">Você ainda não participa de um Squad.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {q.data.squads.map((s) => (
                <article key={s.id} className="rounded-xl border p-5">
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
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Atividade verificada</h2>
          {!q.data?.activity.length ? (
            <p className="mt-3 text-muted-foreground">Nenhuma atividade visível.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {q.data.activity.map((a) => (
                <article key={a.id} className="rounded-xl border p-4">
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
