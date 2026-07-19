import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/lib/modules";

export function DashboardQuickActions() {

  const modules = MODULES.filter(
    module => module.group === "modules"
  ).slice(0,6);

  return (

    <section>

      <h2 className="mb-5 font-display text-2xl">
        Quick Actions
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {modules.map(module => (

          <Link

            key={module.id}

            to={module.path}

            className="
              group
              rounded-3xl
              border
              border-border
              bg-surface
              p-5
              transition-all
              hover:border-[color:var(--gold)]
            "

          >

            <div className="flex items-center justify-between">

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-surface-elevated
                "
              >
                <module.icon className="h-6 w-6"/>

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

            </div>

            <h3 className="mt-5 font-medium">
              {module.label}
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {module.description}
            </p>

          </Link>

        ))}

      </div>

    </section>

  );

}
