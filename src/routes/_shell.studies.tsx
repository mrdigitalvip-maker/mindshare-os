import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Brain } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/_shell/studies")({
  head: () => ({ meta: [{ title: "Studies — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader eyebrow="Modules" title="Studies" description="Learn faster with AI-guided study sessions." />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Study plans", copy: "Personalized paths" },
          { icon: Brain, title: "Flashcards", copy: "Smart spaced repetition" },
          { icon: GraduationCap, title: "Progress", copy: "Track what you know" },
        ].map((c) => (
          <div key={c.title} className="glass rounded-2xl p-6">
            <c.icon className="h-5 w-5 text-gold" />
            <h3 className="mt-3 font-display text-xl">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.copy}</p>
          </div>
        ))}
      </div>
    </PageShell>
  ),
});
