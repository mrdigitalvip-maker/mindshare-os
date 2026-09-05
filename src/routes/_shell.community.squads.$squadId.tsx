import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import {
  createInvite,
  deleteSquad,
  getSquad,
  leaveSquad,
  parityKeys,
  removeSquadMember,
  safeBackendError,
  setBlock,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/community/squads/$squadId")({ component: SquadPage });
function SquadPage() {
  const { squadId } = Route.useParams(),
    qc = useQueryClient(),
    nav = useNavigate(),
    [invite, setInvite] = useState<{ code: string; expiresAt: Date } | null>(null);
  const q = useQuery({ queryKey: parityKeys.squad(squadId), queryFn: () => getSquad(squadId) });
  const mutation = useMutation({
    mutationFn: async (v: { kind: string; member?: string }) => {
      if (v.kind === "invite") return createInvite(squadId);
      if (v.kind === "delete") return deleteSquad(squadId);
      if (v.kind === "leave") return leaveSquad(squadId);
      if (v.kind === "remove" && v.member) return removeSquadMember(squadId, v.member);
      if (v.kind === "block" && v.member) return setBlock(v.member, true);
    },
    onSuccess: async (data, vars) => {
      if (vars.kind === "invite" && data) setInvite(data as { code: string; expiresAt: Date });
      else if (vars.kind === "delete" || vars.kind === "leave") await nav({ to: "/community" });
      await qc.invalidateQueries({ queryKey: parityKeys.community });
      await q.refetch();
      toast.success("Ação concluída.");
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  async function copy() {
    if (!invite) return;
    try {
      await copyText(invite.code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  }
  return (
    <PageShell>
      <Link to="/community" className="text-sm underline">
        ← Comunidade
      </Link>
      <PageHeader
        title={q.data?.name || "Squad"}
        description="Membros e controles canônicos do Squad."
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.data}
        onRetry={() => void q.refetch()}
      >
        {q.data && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => mutation.mutate({ kind: "invite" })}
                disabled={mutation.isPending}
              >
                Criar convite
              </Button>
              {q.data.role === "owner" ? (
                <Button variant="destructive" onClick={() => mutation.mutate({ kind: "delete" })}>
                  Encerrar Squad
                </Button>
              ) : (
                <Button variant="outline" onClick={() => mutation.mutate({ kind: "leave" })}>
                  Sair do Squad
                </Button>
              )}
            </div>
            {invite && (
              <div className="mt-4 rounded-xl border p-4" role="status">
                <p>
                  Código: <strong>{invite.code}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Expira em {invite.expiresAt.toLocaleString("pt-BR")}
                </p>
                <Button className="mt-2" size="sm" onClick={copy}>
                  Copiar código
                </Button>
              </div>
            )}
            <section className="mt-8">
              <h2 className="text-xl font-semibold">
                Membros ({q.data.members.length}/{q.data.max_members})
              </h2>
              <ul className="mt-3 space-y-2">
                {q.data.members.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                  >
                    <span>
                      {m.display_name} · {m.role}
                    </span>
                    {!m.is_self && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => mutation.mutate({ kind: "block", member: m.user_id })}
                        >
                          Bloquear
                        </Button>
                        {q.data!.role === "owner" && m.role === "member" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => mutation.mutate({ kind: "remove", member: m.user_id })}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </RouteState>
    </PageShell>
  );
}
