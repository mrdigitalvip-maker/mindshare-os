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
import experienceCss from "../experience-modules.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { RuntimeErrorService } from "../services/runtime-error-service";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/providers/language-provider";
import { ModuleAtmosphere } from "@/components/module-atmosphere";
import { WebAppPrompts } from "@/components/web-app-prompts";

const SITE_URL = "https://kivryn.co/";
const BRAND_ICON_URL = "https://kivryn.co/icon-512.png";
const SITE_DESCRIPTION =
  "KIVRYN is a personal AI operating system that unifies AI agents, projects, tasks, studies, documents, content, translation and daily planning in one intelligent workspace.";

const SEARCH_IDENTITY_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      url: SITE_URL,
      name: "KIVRYN",
      alternateName: ["KIVRYN AI", "KIVRYN Personal AI Operating System"],
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "Aether Systems",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: BRAND_ICON_URL,
        width: 512,
        height: 512,
      },
      brand: {
        "@type": "Brand",
        name: "KIVRYN",
        logo: BRAND_ICON_URL,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#app`,
      name: "KIVRYN",
      alternateName: "KIVRYN AI",
      url: SITE_URL,
      image: BRAND_ICON_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Android, Web",
      publisher: { "@id": `${SITE_URL}#organization` },
    },
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Error 404</p>
        <h1 className="mt-4 font-display text-7xl">Lost in space</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That page isn't part of your KIVRYN yet.
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

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const [portuguese, setPortuguese] = useState(false);
  const [reference] = useState(() => RuntimeErrorService.referenceFor(error));
  useEffect(() => {
    setPortuguese(navigator.language.toLowerCase().startsWith("pt"));
  }, []);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    RuntimeErrorService.capture(error, {
      boundary: "tanstack_root_error_component",
      module: window.location.pathname.split("/").filter(Boolean)[0] || "root",
    });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {portuguese ? "Algo deu errado" : "Something broke"}
        </p>
        <h1 className="mt-4 font-display text-5xl">
          {portuguese ? "Algo deu errado" : "Something went wrong"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {portuguese
            ? "A KIVRYN não conseguiu concluir isso. Tente novamente ou volte ao início."
            : "KIVRYN couldn't finish that. Try again or head home."}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Reference: {reference}</p>
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
      { title: "KIVRYN — Your Personal AI Operating System" },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "application-name", content: "KIVRYN" },
      { name: "theme-color", content: "#0a0a0b" },
      { name: "author", content: "Aether Systems" },
      {
        name: "robots",
        content: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      },
      { name: "google", content: "notranslate" },
      { property: "og:title", content: "KIVRYN — Your Personal AI Operating System" },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "KIVRYN" },
      { property: "og:image", content: BRAND_ICON_URL },
      { property: "og:image:alt", content: "KIVRYN app icon" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "KIVRYN — Your Personal AI Operating System" },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: BRAND_ICON_URL },
      { name: "twitter:image:alt", content: "KIVRYN app icon" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "KIVRYN" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: experienceCss },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(SEARCH_IDENTITY_SCHEMA),
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
    <html lang="en" translate="no">
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
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      RuntimeErrorService.capture(event.error ?? new Error(event.message), {
        boundary: "window_error",
        module: window.location.pathname.split("/").filter(Boolean)[0] || "root",
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      RuntimeErrorService.capture(event.reason, {
        boundary: "unhandled_rejection",
        module: window.location.pathname.split("/").filter(Boolean)[0] || "root",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider queryClient={queryClient}>
          <Outlet />
          <ModuleAtmosphere />
          <WebAppPrompts />
          <Toaster theme="dark" position="top-center" richColors />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
