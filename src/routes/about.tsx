import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const ABOUT_DESCRIPTION =
  "Learn about KIVRYN, a Personal AI Operating System by Aether Systems that brings AI agents, projects, tasks, studies, documents, content, translation and daily planning into one intelligent workspace.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About KIVRYN — Personal AI Operating System" },
      { name: "description", content: ABOUT_DESCRIPTION },
      { property: "og:title", content: "About KIVRYN — Personal AI Operating System" },
      { property: "og:description", content: ABOUT_DESCRIPTION },
      { property: "og:url", content: "https://kivryn.co/about" },
    ],
    links: [{ rel: "canonical", href: "https://kivryn.co/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": "https://kivryn.co/about#page",
          url: "https://kivryn.co/about",
          name: "About KIVRYN",
          description: ABOUT_DESCRIPTION,
          mainEntity: { "@id": "https://kivryn.co/#app" },
          isPartOf: { "@id": "https://kivryn.co/#website" },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to KIVRYN
        </Link>

        <section className="mt-16">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">About KIVRYN</p>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">
            Your Personal <span className="text-gold italic">AI</span> Operating System
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted-foreground">
            KIVRYN is a Personal AI Operating System designed to help people organize their digital
            life with artificial intelligence. It brings AI assistance, agents, productivity,
            projects, tasks, studies, documents, content creation, translation and daily planning
            into one intelligent workspace.
          </p>
        </section>

        <section className="mt-16 grid gap-5 md:grid-cols-2">
          <article className="glass rounded-2xl p-6">
            <h2 className="font-display text-3xl">Why KIVRYN exists</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Digital work is fragmented across too many disconnected tools. KIVRYN is built to
              help users think, plan, organize and execute from one place while keeping context
              connected across the work that matters.
            </p>
          </article>
          <article className="glass rounded-2xl p-6">
            <h2 className="font-display text-3xl">AI with boundaries</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              KIVRYN uses AI as intelligence inside a system controlled by the product. The user
              remains in control of permissions, context, data and actions rather than giving AI
              unrestricted access to the workspace.
            </p>
          </article>
        </section>

        <section className="mt-16 border-t border-border pt-12">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Built by</p>
          <h2 className="mt-3 font-display text-4xl">Aether Systems</h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
            KIVRYN is developed by Aether Systems with a focus on useful AI, coherent workflows,
            privacy, reliability and a calmer digital experience across web and Android.
          </p>
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-surface p-8 text-center md:p-12">
          <h2 className="font-display text-4xl">Meet KIVRYN</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            One intelligent workspace for AI agents, projects, learning, documents, content and
            daily planning.
          </p>
          <Link to="/auth" search={{ mode: "signup" }} className="mt-7 inline-block">
            <Button size="lg" className="rounded-full px-8">
              Get started <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </section>
      </div>
    </main>
  );
}
