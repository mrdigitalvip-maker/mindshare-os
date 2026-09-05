import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="command-page-header flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground md:text-xs">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-2 font-display text-2xl font-semibold leading-tight md:text-[2.5rem]">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2 w-full md:w-auto">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="command-empty-state flex min-h-64 flex-col items-center justify-center rounded-3xl bg-surface/40 px-5 py-10 text-center md:min-h-[45vh]"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>

      <h3 className="font-display text-xl">{title}</h3>

      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>

      {action && <div className="mt-6 w-full flex justify-center">{action}</div>}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-w-0 overflow-x-clip
        w-full
        min-h-[100dvh]
        px-4
        pt-4
        pb-24
        sm:px-5
        md:px-8
        md:pt-8
        md:pb-10
        lg:mx-auto
        lg:max-w-[1480px]
      "
    >
      {children}
    </main>
  );
}
