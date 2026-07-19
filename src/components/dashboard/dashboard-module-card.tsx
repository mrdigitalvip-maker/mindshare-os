import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

export function DashboardModuleCard({
  title,
  description,
  icon: Icon,
  href,
}: Props) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: .25 }}
    >
      <Link
        to={href}
        className="
          group
          flex
          items-center
          gap-5
          rounded-3xl
          border
          border-border
          bg-surface
          p-5
          transition-all
          hover:border-[color:var(--gold)]
        "
      >
        <div className="
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          bg-surface-elevated
        ">
          <Icon className="h-6 w-6"/>
        </div>

        <div className="flex-1">

          <h3 className="font-medium">
            {title}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>

        </div>

        <ArrowRight
          className="
            h-5
            w-5
            opacity-40
            transition
            group-hover:translate-x-1
          "
        />

      </Link>
    </motion.div>
  );
}
