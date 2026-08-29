import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { packDetail, parityKeys, safeBackendError, startPack } from "@/services/parity-service";
export const Route = createFileRoute("/_shell/packs/$slug")({ component: PackPage });
function PackPage() {
  const { slug } = Route.useParams(),
    q = useQuery({ queryKey: parityKeys.pack(slug), queryFn: () => packDetail(slug) }),
    qc = useQueryClient(),
    nav = useNavigate(),
    key = useRef(crypto.randomUUID()),
    [preview, setPreview] = useState(false),
    [values, setValues] = useState({ goal: "", targetDate: "", context: "" });
  const start = useMutation({
    mutationFn: () =>
      startPack(q.data!.pack.id, key.current, values.goal, values.targetDate, values.context),
    onSuccess: async (id) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: parityKeys.journeys }),
        qc.invalidateQueries({ queryKey: parityKeys.mission }),
        qc.invalidateQueries({ queryKey: parityKeys.packs }),
      ]);
      toast.success("Jornada criada.");
      await nav({ to: "/journeys/$journeyId", params: { journeyId: id } });
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (preview) start.mutate();
    else setPreview(true);
  }
  return (
    <PageShell>
      <Link to="/packs" className="text-sm underline">
        ← Packs
      </Link>
      <PageHeader
        title={q.data?.pack.title || "Journey Pack"}
        description={q.data?.pack.short_description || "Detalhes do Pack"}
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.data}
        onRetry={() => void q.refetch()}
      >
        {q.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <p>{q.data.pack.description}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Duração esperada: {q.data.pack.duration_days} dias · {q.data.pack.difficulty}
              </p>
              <h2 className="mt-6 text-xl font-semibold">Etapas</h2>
              <ol className="mt-3 space-y-3">
                {q.data.steps.slice(0, 8).map((s) => (
                  <li className="rounded-xl border p-4" key={s.id}>
                    <strong>
                      {s.sequence}. {s.title}
                    </strong>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </li>
                ))}
              </ol>
            </section>
            <form
              onSubmit={submit}
              className="grid content-start gap-3 rounded-xl border p-5"
              aria-label="Iniciar Journey Pack"
            >
              <h2 className="text-xl font-semibold">{preview ? "Confirmar" : "Personalizar"}</h2>
              <label htmlFor="pack-goal">Sua meta</label>
              <Input
                id="pack-goal"
                required
                maxLength={160}
                value={values.goal}
                disabled={preview}
                onChange={(e) => {
                  setValues({ ...values, goal: e.target.value });
                  setPreview(false);
                }}
              />
              <label htmlFor="pack-target">Data-alvo (opcional)</label>
              <Input
                id="pack-target"
                type="date"
                min={new Date().toLocaleDateString("en-CA")}
                value={values.targetDate}
                disabled={preview}
                onChange={(e) => setValues({ ...values, targetDate: e.target.value })}
              />
              <label htmlFor="pack-context">Contexto (opcional)</label>
              <Textarea
                id="pack-context"
                maxLength={1000}
                value={values.context}
                disabled={preview}
                onChange={(e) => setValues({ ...values, context: e.target.value })}
              />
              {preview && (
                <div className="rounded-lg bg-muted p-3 text-sm" role="status">
                  <strong>Prévia:</strong> {values.goal}
                  <br />
                  {values.targetDate && `Até ${values.targetDate}`}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={start.isPending || !values.goal.trim()}>
                  {start.isPending ? "Aplicando…" : preview ? "Aplicar Pack" : "Visualizar"}
                </Button>
                {preview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreview(false)}
                    disabled={start.isPending}
                  >
                    Voltar
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}
      </RouteState>
    </PageShell>
  );
}
