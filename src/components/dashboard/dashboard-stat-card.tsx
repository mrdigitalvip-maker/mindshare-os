import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type DashboardStatCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  delay?: number;
};

export function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  delay = 0,
}: DashboardStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay,
      }}
      whileHover={{
        y: -4,
      }}
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-border
        bg-surface
        p-6
        transition-all
        duration-300
        hover:border-[color:var(--gold)]
        hover:shadow-xl
      "
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[color:var(--gold)]/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.30em] text-muted-foreground">{label}</p>

          <h3 className="mt-4 font-display text-4xl">{value}</h3>

          <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
        </div>

        <div
          className="
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-surface-elevated
            transition-all
            duration-300
            group-hover:scale-110
            group-hover:bg-[color:var(--gold)]/15
          "
        >
          <Icon
            className="
              h-6
              w-6
              text-muted-foreground
              transition-colors
              duration-300
              group-hover:text-[color:var(--gold)]
            "
          />
        </div>
      </div>
    </motion.div>
  );
}
