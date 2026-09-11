import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle, Sparkles } from "lucide-react";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <div className="v2-workspace mx-auto min-w-0 max-w-7xl space-y-6">{children}</div>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="v2-surface flex max-w-full flex-wrap items-center gap-2 rounded-2xl p-2">
      {children}
    </div>
  );
}

/** Consistent section identity for dense secondary workspaces. */
export function WorkspaceSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-4 w-0.5 rounded-full bg-intelligence" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold">{title}</h2>
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "positive" | "warning" | "negative" | "neutral" | "active";
}) {
  const tones = {
    positive: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    negative: "border-destructive/30 bg-destructive/10 text-destructive",
    neutral: "border-border bg-muted/40 text-muted-foreground",
    active: "border-intelligence/30 bg-intelligence/10 text-intelligence",
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
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
    <div className="v2-surface min-w-0 rounded-2xl p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A single semantic progress treatment shared by every V2 workspace. */
export function WorkspaceProgress({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
    >
      <div
        className="h-full rounded-full bg-intelligence transition-[width] motion-reduce:transition-none"
        style={{ width: `${normalized}%` }}
      />
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
    <aside className="rounded-2xl border border-intelligence/30 bg-intelligence/5 p-4 text-sm">
      {children}
    </aside>
  );
}
