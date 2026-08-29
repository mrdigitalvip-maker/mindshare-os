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
      <p role="status" className="py-16 text-center text-muted-foreground">
        Loading your NEXORA data…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="py-16 text-center">
        <p>We couldn't load this page.</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (empty)
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p>Nothing here yet.</p>
        <p className="mt-1 text-sm">New verified activity will appear here.</p>
      </div>
    );
  return <>{children}</>;
}
