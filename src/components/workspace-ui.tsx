import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle, Sparkles } from "lucide-react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-w-0 max-w-7xl space-y-6">{children}</div>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border bg-surface/40 p-2">
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-surface/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LoadingState({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  );
}

export function ErrorState({ title, retry }: { title: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 p-6">
      <h2 className="font-semibold">{title}</h2>
      <button className="mt-3 min-h-11 text-sm underline" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

export function AIAction({
  icon: Icon = Sparkles,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {children}
    </span>
  );
}

export function PremiumGate({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm">{children}</aside>
  );
}
