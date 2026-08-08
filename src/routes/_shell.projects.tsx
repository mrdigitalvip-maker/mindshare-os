import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProjectService, TaskService, workspaceQueryKeys } from "@/services";
import { useAuth } from "@/lib/auth-context";
export const Route = createFileRoute("/_shell/projects")({
  head: () => ({ meta: [{ title: "Projetos — NEXORA" }] }),
  component: Projects,
});
function Projects() {
  const [wizard, setWizard] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const key = workspaceQueryKeys.projects(user?.id);
  const query = useQuery({
    queryKey: key,
    queryFn: () => ProjectService.list(),
    enabled: isAuthenticated && !!user,
  });
  return (
    <PageShell>
      <PageHeader
        eyebrow="Organização"
        title="Projetos"
        description="Planeje o trabalho e acompanhe o progresso real das tarefas."
        actions={
          <Button onClick={() => setWizard(true)}>
            <Plus /> Novo projeto
          </Button>
        }
      />
      {query.isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Carregando projetos…</p>
      ) : query.isError ? (
        <div
          className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          role="alert"
        >
          <h2 className="font-semibold">Não foi possível carregar os projetos.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : !query.data?.length ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto"
          description="Crie um projeto e suas primeiras tarefas."
          action={<Button onClick={() => setWizard(true)}>Criar projeto</Button>}
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="glass min-w-0 rounded-2xl p-5 transition hover:border-gold/40"
            >
              <span className="text-xs uppercase text-muted-foreground">{project.status}</span>
              <h2 className="mt-1 truncate font-display text-xl">{project.title}</h2>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {project.description || "Sem descrição"}
              </p>
              <div className="mt-5 h-2 rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {project.completedTasks}/{project.totalTasks} tarefas · {project.progress}%
              </p>
            </Link>
          ))}
        </div>
      )}
      <ProjectWizard open={wizard} close={() => setWizard(false)} />
    </PageShell>
  );
}
function ProjectWizard({ open, close }: { open: boolean; close: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const key = workspaceQueryKeys.projects(user?.id);
  const client = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    objective: "",
    priority: "medium",
    status: "active",
    startDate: "",
    dueDate: "",
    tasks: [""],
  });
  const set = (name: string, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const create = useMutation({
    mutationFn: async () => {
      const project = await ProjectService.create({
        ...form,
        startDate: form.startDate || null,
        dueDate: form.dueDate || null,
      });
      await Promise.all(
        form.tasks
          .filter(Boolean)
          .map((title) => TaskService.createTask({ title, projectId: project.id })),
      );
      return project;
    },
    onSuccess: async (project) => {
      await client.invalidateQueries({ queryKey: key });
      toast.success("Projeto criado");
      close();
      navigate({ to: "/projects/$projectId", params: { projectId: project.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo projeto · etapa {step} de 4</DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Nome">
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <Field label="Objetivo">
              <Textarea value={form.objective} onChange={(e) => set("objective", e.target.value)} />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Prioridade"
              value={form.priority}
              onChange={(v) => set("priority", v)}
              options={[
                ["low", "Baixa"],
                ["medium", "Média"],
                ["high", "Alta"],
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => set("status", v)}
              options={[
                ["active", "Ativo"],
                ["paused", "Pausado"],
              ]}
            />
            <Field label="Data inicial">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="Prazo">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </Field>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Adicione até três tarefas iniciais.</p>
            {form.tasks.map((task, i) => (
              <Input
                key={i}
                value={task}
                placeholder={`Tarefa ${i + 1}`}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    tasks: c.tasks.map((v, n) => (n === i ? e.target.value : v)),
                  }))
                }
              />
            ))}
            {form.tasks.length < 3 && (
              <Button
                variant="outline"
                onClick={() => setForm((c) => ({ ...c, tasks: [...c.tasks, ""] }))}
              >
                Adicionar tarefa
              </Button>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="rounded-xl border p-4">
            <h3 className="font-display text-xl">{form.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {form.description || "Sem descrição"}
            </p>
            <p className="mt-4 text-sm">
              Prioridade: {form.priority} · {form.tasks.filter(Boolean).length} tarefas
            </p>
          </div>
        )}
        <div className="mt-5 flex justify-between">
          <Button variant="outline" onClick={() => (step === 1 ? close() : setStep(step - 1))}>
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          <Button
            disabled={(step === 1 && !form.title.trim()) || create.isPending}
            onClick={() => (step < 4 ? setStep(step + 1) : create.mutate())}
          >
            {step < 4 ? "Continuar" : create.isPending ? "Criando…" : "Criar projeto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <Field label={label}>
      <select
        className="h-11 w-full rounded-md border border-input bg-background px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}
