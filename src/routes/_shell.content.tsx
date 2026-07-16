import { createFileRoute } from "@tanstack/react-router";
import { PenLine, Wand2, FileText } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/_shell/content")({
  head: () => ({ meta: [{ title: "Content — NEXORA" }] }),
  component: () => (
    <PageShell>
      <PageHeader eyebrow="Modules" title="Content" description="Draft, edit and publish across formats and channels." />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { icon: PenLine, title: "Drafts", copy: "Long-form writing" },
          { icon: Wand2, title: "Rewrite", copy: "Refine your voice" },
          { icon: FileText, title: "Templates", copy: "Post, email, script" },
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
