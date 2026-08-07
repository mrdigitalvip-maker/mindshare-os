import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudyService, workspaceQueryKeys } from "@/services";
export const Route = createFileRoute("/_shell/studies")({ component: Studies });
function Studies() {
  const nav = useNavigate();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const plans = useQuery({ queryKey: workspaceQueryKeys.studies, queryFn: StudyService.listPlans });
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const create = useMutation({
    mutationFn: () => StudyService.createSubject({ name: name.trim(), color }),
    onSuccess: async (s) => {
      await client.invalidateQueries({ queryKey: workspaceQueryKeys.studies });
      setOpen(false);
      nav({ to: "/studies/$subjectId", params: { subjectId: s.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <PageShell>
      <PageHeader
        eyebrow="Learning"
        title="Studies"
        description="Subjects, real study sessions and AI assistance."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            New subject
          </Button>
        }
      />
      {!plans.isLoading && !plans.data?.length ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Create a subject, then record sessions in its workspace."
        />
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data?.map((p) => (
            <button
              key={p.id}
              className="glass rounded-2xl p-5 text-left"
              onClick={() => nav({ to: "/studies/$subjectId", params: { subjectId: p.id } })}
            >
              <h2 className="text-xl font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.progress}% of recorded sessions completed
              </p>
            </button>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New subject</DialogTitle>
          </DialogHeader>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Label>Color</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            Create and open
          </Button>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
