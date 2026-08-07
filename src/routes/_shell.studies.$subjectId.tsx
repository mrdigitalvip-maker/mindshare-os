import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Brain, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudyService, workspaceQueryKeys } from "@/services";
export const Route = createFileRoute("/_shell/studies/$subjectId")({ component: Workspace });
const ops = ["explain", "summarize", "questions", "flashcards", "study_plan"] as const;
function Workspace() {
  const { subjectId } = Route.useParams();
  const nav = useNavigate();
  const client = useQueryClient();
  const subject = useQuery({
    queryKey: [...workspaceQueryKeys.studies, subjectId],
    queryFn: () => StudyService.getSubject(subjectId),
  });
  const sessions = useQuery({
    queryKey: [...workspaceQueryKeys.studies, subjectId, "sessions"],
    queryFn: () => StudyService.listSubjectSessions(subjectId),
  });
  const [minutes, setMinutes] = useState("30");
  const [completed, setCompleted] = useState(true);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState("");
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: workspaceQueryKeys.studies }),
      sessions.refetch(),
    ]);
  const record = useMutation({
    mutationFn: () =>
      StudyService.recordSession({ subject_id: subjectId, duration: Number(minutes), completed }),
    onSuccess: async () => {
      await refresh();
      toast.success("Session recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const ai = useMutation({
    mutationFn: (operation: (typeof ops)[number]) =>
      StudyService.assist({ operation, text: [topic, context].filter(Boolean).join("\n\n") }),
    onSuccess: (r) => setResult(r.content),
    onError: (e: Error) => toast.error(e.message),
  });
  if (subject.isLoading)
    return (
      <PageShell>
        <p>Loading subject…</p>
      </PageShell>
    );
  if (!subject.data)
    return (
      <PageShell>
        <EmptyState
          icon={Trash2}
          title="Subject not found"
          description="It does not exist or does not belong to you."
        />
      </PageShell>
    );
  const total = (sessions.data ?? []).reduce((n, s) => n + (s.duration ?? 0), 0),
    done = (sessions.data ?? []).filter((s) => s.completed).length;
  return (
    <PageShell>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => nav({ to: "/studies" })}>
          <ArrowLeft />
          Studies
        </Button>
        <Button
          variant="destructive"
          onClick={async () => {
            if (confirm("Delete this subject and its sessions?")) {
              await StudyService.removeSubject(subjectId);
              nav({ to: "/studies" });
            }
          }}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
      <h1 className="mt-5 text-3xl font-semibold">{subject.data.name}</h1>
      <Tabs defaultValue="overview" className="mt-6 min-w-0">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="ai">AI Tools</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["Sessions", sessions.data?.length ?? 0],
              ["Completed", done],
              ["Minutes studied", total],
            ].map(([l, v]) => (
              <div className="glass rounded-2xl p-5" key={l}>
                <p className="text-sm text-muted-foreground">{l}</p>
                <p className="mt-2 text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sessions">
          <div className="glass mt-4 max-w-xl space-y-4 rounded-2xl p-5">
            <label>
              Duration (minutes)
              <Input
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              Completed
            </label>
            <Button
              disabled={Number(minutes) <= 0 || record.isPending}
              onClick={() => record.mutate()}
            >
              Record session
            </Button>
            <p className="text-xs text-muted-foreground">
              Sessions use the persisted duration, completion status and creation date supported by
              the schema.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="ai">
          <div className="mt-4 space-y-3">
            <Input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <Textarea
              placeholder="Optional context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <div className="flex max-w-full gap-2 overflow-x-auto pb-2">
              {ops.map((op) => (
                <Button
                  className="shrink-0"
                  variant="outline"
                  key={op}
                  disabled={!topic.trim() || ai.isPending}
                  onClick={() => ai.mutate(op)}
                >
                  <Brain />
                  {op}
                </Button>
              ))}
            </div>
            {result && <div className="whitespace-pre-wrap rounded-xl border p-4">{result}</div>}
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="mt-4 space-y-2">
            {sessions.data?.map((s) => (
              <div className="glass rounded-xl p-4" key={s.id}>
                {s.duration ?? 0} minutes · {s.completed ? "Completed" : "Not completed"} ·{" "}
                {new Date(s.created_at ?? "").toLocaleString()}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
