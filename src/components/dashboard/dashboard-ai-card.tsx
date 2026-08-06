import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

export function DashboardAiCard({ title, description, action = "Open", onAction }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-border
        bg-surface
        p-6
      "
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[color:var(--gold)]/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            AI Suggestion
          </span>
        </div>

        <h3 className="mt-5 font-display text-2xl">{title}</h3>

        <p className="mt-3 text-sm text-muted-foreground leading-6">{description}</p>

        <Button size="sm" className="mt-6 rounded-full" onClick={onAction}>
          {action}

          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
