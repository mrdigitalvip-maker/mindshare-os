import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CommandSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("command-surface", className)}>{children}</section>;
}

export function CommandSectionHeading({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  id: string;
  action?: ReactNode;
}) {
  return (
    <div className="command-home__section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function CommandState({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={cn("command-home__state", error && "is-error")}
      role={error ? "alert" : "status"}
    >
      <span aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
