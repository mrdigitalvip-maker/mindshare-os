import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, BookOpen, Brain, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { StudyService, type StudyPlan } from "@/services";

export const Route = createFileRoute("/_shell/studies")({
  head: () => ({ meta: [{ title: "Studies — NEXORA" }] }),
  component: Studies,
});

function Studies() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const averageProgress = Math.round(
    plans.reduce((total, plan) => total + plan.progress, 0) / Math.max(plans.length, 1),
  );

  useEffect(() => {
    void StudyService.listPlans()
      .then(setPlans)
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load data");
      });
  }, []);

  async function addPlan() {
    try {
      const created = await StudyService.createPlan();
      setPlans((current) => [created, ...current]);
      toast.success("Study plan created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create study plan");
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Studies"
        description="Learn faster with AI-guided study sessions."
        actions={
          <Button className="rounded-full" onClick={addPlan}>
            <Plus className="mr-1 h-4 w-4" /> New plan
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Study plans", copy: `${plans.length} active` },
          { icon: Brain, title: "Flashcards", copy: "Smart spaced repetition" },
          { icon: GraduationCap, title: "Progress", copy: `${averageProgress}% average` },
        ].map((card) => (
          <div key={card.title} className="glass rounded-2xl p-6">
            <card.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{card.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="glass rounded-2xl p-5">
            <h3 className="font-display text-xl">{plan.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Next session: {plan.nextSession}</p>
            <div className="mt-4 h-2 rounded-full bg-surface">
              <div className="h-full rounded-full bg-gold" style={{ width: `${plan.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
