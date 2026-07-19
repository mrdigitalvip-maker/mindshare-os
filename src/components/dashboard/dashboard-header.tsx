import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type Props = {
  name: string;
};

function greeting() {
  const hour = new Date().getHours();

  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

export function DashboardHeader({ name }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .35 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--gold)]" />
        NEXORA Dashboard
      </div>

      <div>
        <h1 className="font-display text-5xl leading-none">
          {greeting()},
          <span className="text-[color:var(--gold)]">
            {" "}
            {name}
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-muted-foreground">
          Welcome back. Your AI workspace is ready. Continue your projects,
          organize your day and let NEXORA help you stay productive.
        </p>
      </div>
    </motion.div>
  );
}
