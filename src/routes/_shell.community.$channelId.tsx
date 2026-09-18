import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  leaveOfficialCommunity,
  listOfficialCommunities,
  listOfficialCommunityMessages,
  markOfficialCommunityRead,
  parityKeys,
  safeBackendError,
  sendOfficialCommunityMessage,
  setOfficialCommunityNotifications,
  subscribeOfficialCommunity,
  type CommunityNotificationMode,
} from "@/services/parity-service";

export const Route = createFileRoute("/_shell/community/$channelId")({
  component: OfficialCommunityConversation,
});

function OfficialCommunityConversation() {
  const { channelId } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [body, setBody] = useState("");

  const channels = useQuery({
    queryKey: parityKeys.communityChannels,
    queryFn: listOfficialCommunities,
  });
  const channel = useMemo(
    () => channels.data?.find((item) => item.id === channelId) ?? null,
    [channelId, channels.data],
  );
  const messages = useQuery({
    queryKey: parityKeys.communityMessages(channelId),
    queryFn: () => listOfficialCommunityMessages(channelId),
    enabled: Boolean(channel?.joined),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!channel?.joined) return;
    const stop = subscribeOfficialCommunity(channelId, () => {
      void qc.invalidateQueries({ queryKey: parityKeys.communityMessages(channelId) });
      void qc.invalidateQueries({ queryKey: parityKeys.communityChannels });
    });
    return stop;
  }, [channel?.joined, channelId, qc]);

  useEffect(() => {
    if (!channel?.joined || !messages.data) return;
    void markOfficialCommunityRead(channelId)
      .then(() => qc.invalidateQueries({ queryKey: parityKeys.communityChannels }))
      .catch(() => undefined);
  }, [channel?.joined, channelId, messages.data, qc]);

  const send = useMutation({
    mutationFn: (value: string) => sendOfficialCommunityMessage(channelId, value),
    onSuccess: async () => {
      setBody("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: parityKeys.communityMessages(channelId) }),
        qc.invalidateQueries({ queryKey: parityKeys.communityChannels }),
      ]);
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });

  const notification = useMutation({
    mutationFn: (mode: CommunityNotificationMode) =>
      setOfficialCommunityNotifications(channelId, mode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: parityKeys.communityChannels });
      toast.success("Notificações atualizadas.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });

  const leave = useMutation({
    mutationFn: () => leaveOfficialCommunity(channelId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: parityKeys.communityChannels });
      toast.success("Você saiu da comunidade.");
      await nav({ to: "/community" });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim() || send.isPending) return;
    send.mutate(body);
  }

  const loading = channels.isLoading || (Boolean(channel?.joined) && messages.isLoading);
  const error = channels.isError || messages.isError;

  return (
    <PageShell>
      <Link to="/community" className="text-sm text-muted-foreground underline">
        ← Comunidade
      </Link>
      <RouteState
        loading={loading}
        error={error}
        empty={false}
        onRetry={() => {
          void channels.refetch();
          void messages.refetch();
        }}
      >
        {!channel ? (
          <section className="v2-surface mt-6 rounded-3xl p-6">
            <h1 className="text-2xl font-semibold">Comunidade indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este espaço não está disponível para seu plano ou não existe mais.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/community">Voltar para Community</Link>
            </Button>
          </section>
        ) : !channel.joined ? (
          <section className="v2-surface mt-6 rounded-3xl p-6">
            <h1 className="text-2xl font-semibold">{channel.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre pela tela principal da Community para começar a participar.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/community">Abrir Community</Link>
            </Button>
          </section>
        ) : (
          <>
            <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
              <div className="border-b p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {channel.premium ? "KIVRYN PREMIUM LOUNGE" : "KIVRYN COMMUNITY"}
                    </p>
                    <PageHeader
                      title={channel.name}
                      description={channel.description ?? "Conversa oficial da KIVRYN."}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {channel.member_count} membros · mensagens oficiais aparecem como KIVRYN • OFICIAL
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={leave.isPending}
                    onClick={() => leave.mutate()}
                  >
                    Sair
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Notificações</span>
                  {(["highlights", "all", "muted"] as CommunityNotificationMode[]).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={channel.notification_mode === mode ? "default" : "outline"}
                      disabled={notification.isPending}
                      onClick={() => notification.mutate(mode)}
                    >
                      {mode === "highlights" ? "Destaques" : mode === "all" ? "Todas" : "Silenciado"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 p-6">
                {!messages.data?.length ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    A conversa começa com os membros.
                  </div>
                ) : (
                  messages.data.map((message) => (
                    <article
                      key={message.id}
                      className={`max-w-3xl rounded-2xl border p-4 ${
                        message.actor_type === "system"
                          ? "border-primary/40 bg-primary/5"
                          : message.is_self
                            ? "ml-auto bg-accent/30"
                            : "bg-background/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className={message.actor_type === "system" ? "text-sm font-semibold text-primary" : "text-sm font-medium"}>
                          {message.actor_type === "system"
                            ? "KIVRYN • OFICIAL"
                            : message.is_self
                              ? "Você"
                              : message.display_name}
                        </span>
                        <time className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleString("pt-BR")}
                        </time>
                      </div>
                      <p className={`mt-2 whitespace-pre-wrap text-sm ${message.removed ? "italic text-muted-foreground" : ""}`}>
                        {message.body}
                      </p>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={submit} className="border-t p-6">
                <label htmlFor="community-message" className="text-sm font-medium">
                  Enviar mensagem
                </label>
                <Textarea
                  id="community-message"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1200}
                  rows={4}
                  className="mt-2"
                  placeholder="Converse com pessoas reais da Community…"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{body.trim().length}/1200</span>
                  <Button type="submit" disabled={!body.trim() || send.isPending}>
                    {send.isPending ? "Enviando…" : "Enviar"}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </RouteState>
    </PageShell>
  );
}
