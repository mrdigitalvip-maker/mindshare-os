import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiSuggestions } from "@/lib/dashboard-data";

export function DashboardSuggestions() {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6">

      <div className="flex items-center gap-2">

        <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />

        <span className="text-xs uppercase tracking-[0.30em] text-muted-foreground">
          AI Suggestions
        </span>

      </div>

      <h2 className="mt-4 font-display text-3xl">
        What should you do next?
      </h2>

      <div className="mt-6 space-y-3">

        {aiSuggestions.map((item) => (

          <div
            key={item.id}
            className="
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-border
              bg-background
              p-4
            "
          >

            <div>

              <h3 className="font-medium">
                {item.title}
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>

            </div>

            <Button
              size="sm"
              variant="ghost"
            >
              Open

              <ArrowRight className="ml-2 h-4 w-4"/>

            </Button>

          </div>

        ))}

      </div>

    </section>
  );
}
