import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
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
  const { t } = useLanguage();
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
        {t("state.loadingData")}
      </div>
    );
  if (error)
    return (
      <div role="alert" className="v2-surface min-h-48 rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-7 w-7 text-destructive" aria-hidden="true" />
        <p>{t("state.loadPageError")}</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          {t("common.retry")}
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
        <p>{t("state.empty")}</p>
        <p className="mt-1 text-sm">{t("state.emptyVerified")}</p>
      </div>
    );
  return <>{children}</>;
}
