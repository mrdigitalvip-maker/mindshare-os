import { motion } from "framer-motion";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function DashboardPremiumCard() {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: .3 }}
      className="
        relative
        overflow-hidden
        rounded-3xl
        border
        border-[color:var(--gold)]/20
        bg-gradient-to-br
        from-[#161616]
        to-[#090909]
        p-7
      "
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--gold)]/10 blur-3xl"/>

      <div className="relative">

        <Crown className="h-7 w-7 text-[color:var(--gold)]"/>

        <h2 className="mt-5 font-display text-3xl">
          Upgrade to Premium
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Unlock every AI Agent, unlimited requests, advanced analytics,
          finance workspace and future premium features.
        </p>

        <Link to="/premium">

          <Button
            className="mt-7 rounded-full"
          >
            Explore Premium

            <ArrowRight className="ml-2 h-4 w-4"/>

          </Button>

        </Link>

      </div>

    </motion.div>
  );
}
