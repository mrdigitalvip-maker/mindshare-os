import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { RouteState } from "@/components/parity-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listPacks,
  parityKeys,
  safeBackendError,
  startPack,
  type Pack,
} from "@/services/parity-service";
export const Route = createFileRoute("/_shell/packs")({ component: Packs });
function Packs() {
  const q = useQuery({ queryKey: parityKeys.packs, queryFn: listPacks }),
    nav = useNavigate();
  const [selected, setSelected] = useState<Pack | null>(null),
    [goal, setGoal] = useState(""),
    [confirm, setConfirm] = useState(false),
    [key, setKey] = useState(() => crypto.randomUUID());
  const start = useMutation({
    mutationFn: () => startPack(selected!.id, key, goal),
    onSuccess: async (id) => {
      toast.success("Journey created.");
      await nav({ to: "/journeys" });
      setKey(crypto.randomUUID());
    },
    onError: (e) => toast.error(safeBackendError(e)),
  });
  return (
    <PageShell>
      <PageHeader
        title="Journey Packs"
        description="Canonical server packs that create Journeys visible on every NEXORA client."
      />
      <RouteState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.data?.length}
        onRetry={() => void q.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data?.map((p) => (
            <article key={p.id} className="rounded-xl border p-5">
              <p className="text-xs uppercase text-muted-foreground">
                {p.category} · {p.duration_days} days
              </p>
              <h2 className="mt-2 text-lg font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.short_description}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelected(p);
                  setConfirm(false);
                }}
              >
                Personalize
              </Button>
            </article>
          ))}
        </div>
        {selected && (
          <section className="mt-8 max-w-xl rounded-xl border p-5" aria-labelledby="pack-preview">
            <h2 id="pack-preview" className="text-xl font-semibold">
              {confirm ? "Confirm Journey" : "Preview"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.title}</p>
            <label className="mt-4 block text-sm font-medium" htmlFor="pack-goal">
              Your goal
            </label>
            <Input
              id="pack-goal"
              className="mt-2"
              maxLength={160}
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                setConfirm(false);
              }}
              disabled={confirm}
            />
            {confirm ? (
              <div className="mt-4 flex gap-2">
                <Button disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? "Creating…" : "Apply Pack"}
                </Button>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Back
                </Button>
              </div>
            ) : (
              <Button className="mt-4" disabled={!goal.trim()} onClick={() => setConfirm(true)}>
                Continue to confirmation
              </Button>
            )}
          </section>
        )}
      </RouteState>
    </PageShell>
  );
}
