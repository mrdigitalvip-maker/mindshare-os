import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export function RouteState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (loading)
    return (
      <div
        role="status"
        aria-live="polite"
        className="v2-surface flex min-h-48 items-center justify-center gap-2 rounded-2xl text-sm text-muted-foreground"
      >
        <LoaderCircle
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />{" "}
        Loading your KIVRYN data…
      </div>
    );
  if (error)
    return (
      <div role="alert" className="v2-surface min-h-48 rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-destructive" aria-hidden="true" />
        <p>We couldn't load this page.</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (empty)
    return (
      <div
        role="status"
        className="v2-surface min-h-48 rounded-2xl p-8 text-center text-muted-foreground"
      >
        <Inbox className="mx-auto mb-3 h-7 w-7" aria-hidden="true" />
        <p>Nothing here yet.</p>
        <p className="mt-1 text-sm">New verified activity will appear here.</p>
      </div>
    );
  return <>{children}</>;
}
