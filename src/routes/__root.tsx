import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Error 404</p>
        <h1 className="mt-4 font-display text-7xl">Lost in space</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That page isn't part of your NEXORA yet.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Return home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [portuguese, setPortuguese] = useState(false);
  useEffect(() => {
    setPortuguese(navigator.language.toLowerCase().startsWith("pt"));
  }, []);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {portuguese ? "Algo deu errado" : "Something broke"}
        </p>
        <h1 className="mt-4 font-display text-5xl">
          {portuguese ? "Um pequeno imprevisto" : "A small hiccup"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {portuguese
            ? "A NEXORA não conseguiu concluir isso. Tente novamente ou volte ao início."
            : "NEXORA couldn't finish that. Try again or head home."}
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {portuguese ? "Tentar novamente" : "Try again"}
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            {portuguese ? "Ir para o início" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "NEXORA — Your Personal AI Operating System" },
      {
        name: "description",
        content:
          "One intelligent workspace for productivity, projects, learning, content and translation. Meet NEXORA.",
      },
      { name: "theme-color", content: "#0a0a0b" },
      { name: "author", content: "NEXORA" },
      { property: "og:title", content: "NEXORA — Your Personal AI Operating System" },
      {
        property: "og:description",
        content:
          "One intelligent workspace for productivity, projects, learning, content and translation. Meet NEXORA.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "NEXORA" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NEXORA — Your Personal AI Operating System" },
      {
        name: "twitter:description",
        content:
          "One intelligent workspace for productivity, projects, learning, content and translation. Meet NEXORA.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "NEXORA" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6a712ae6-117a-4a0c-8391-ad00fb6cdc32/id-preview-d1a46c79--d8c0127f-dba3-4b59-a665-c0390e80af60.lovable.app-1784244151527.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6a712ae6-117a-4a0c-8391-ad00fb6cdc32/id-preview-d1a46c79--d8c0127f-dba3-4b59-a665-c0390e80af60.lovable.app-1784244151527.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/nexora-icon.png" },
      { rel: "apple-touch-icon", href: "/nexora-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      reportLovableError(
        error instanceof Error ? error : new Error("Service worker registration failed"),
        {
          boundary: "service_worker_registration",
        },
      );
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
