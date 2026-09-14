import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/providers/language-provider";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=kivryn.app";
const INSTALLED_STORAGE_KEY = "kivryn.web.pwa-installed.v1";
const ANDROID_PROMO_LAST_SHOWN_KEY = "kivryn.web.android-promo.last-shown.v1";

const INSTALL_FIRST_DELAY_MS = 4_000;
const INSTALL_VISIBLE_MS = 9_000;
const INSTALL_REPEAT_MS = 15 * 60 * 1_000;
const ANDROID_PROMO_DELAY_MS = 45_000;
const ANDROID_PROMO_VISIBLE_MS = 12_000;
const ANDROID_PROMO_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1_000;

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type RelatedApplication = {
  id?: string;
  platform?: string;
  url?: string;
};

type NavigatorWithInstallState = Navigator & {
  standalone?: boolean;
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithInstallState).standalone === true
  );
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The prompts still work for the current session when storage is blocked.
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore hardened/private browser storage failures.
  }
}

export function WebAppPrompts() {
  const { isAuthenticated, loading } = useAuth();
  const { resolvedLocale } = useLanguage();
  const portuguese = resolvedLocale === "pt-BR";
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined"
      ? false
      : isStandaloneDisplay() || readStorage(INSTALLED_STORAGE_KEY) === "1",
  );
  const [nativeAndroidInstalled, setNativeAndroidInstalled] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showAndroidPromo, setShowAndroidPromo] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      // Browsers only emit this event when the site is installable. If a user
      // previously uninstalled KIVRYN but site storage survived, allow the
      // prompt to become eligible again.
      removeStorage(INSTALLED_STORAGE_KEY);
      setInstalled(false);
      setDeferredInstall(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      writeStorage(INSTALLED_STORAGE_KEY, "1");
      setInstalled(true);
      setShowInstall(false);
      setDeferredInstall(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const media = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (!media.matches) return;
      writeStorage(INSTALLED_STORAGE_KEY, "1");
      setInstalled(true);
      setShowInstall(false);
      setDeferredInstall(null);
    };
    media.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    const relatedApps = (navigator as NavigatorWithInstallState).getInstalledRelatedApps;
    if (!relatedApps) return;

    let active = true;
    const refresh = () => {
      void relatedApps
        .call(navigator)
        .then((apps) => {
          if (!active) return;
          setNativeAndroidInstalled(
            apps.some(
              (app) =>
                app.id === "kivryn.app" ||
                (typeof app.url === "string" && app.url.includes("id=kivryn.app")),
            ),
          );
        })
        .catch(() => {
          // Detection is an enhancement only; never block the web experience.
        });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (loading || !isAuthenticated || installed || !deferredInstall) {
      setShowInstall(false);
      return;
    }

    let hideTimer: number | undefined;
    let repeatTimer: number | undefined;
    let cancelled = false;

    const showCycle = () => {
      if (cancelled) return;
      setShowInstall(true);
      hideTimer = window.setTimeout(() => {
        setShowInstall(false);
        repeatTimer = window.setTimeout(showCycle, INSTALL_REPEAT_MS);
      }, INSTALL_VISIBLE_MS);
    };

    const firstTimer = window.setTimeout(showCycle, INSTALL_FIRST_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(firstTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
      if (repeatTimer) window.clearTimeout(repeatTimer);
    };
  }, [deferredInstall, installed, isAuthenticated, loading]);

  useEffect(() => {
    if (loading || !isAuthenticated || nativeAndroidInstalled) {
      setShowAndroidPromo(false);
      return;
    }

    const lastShown = Number(readStorage(ANDROID_PROMO_LAST_SHOWN_KEY) || "0");
    if (Number.isFinite(lastShown) && Date.now() - lastShown < ANDROID_PROMO_COOLDOWN_MS) return;

    let hideTimer: number | undefined;
    const showTimer = window.setTimeout(() => {
      writeStorage(ANDROID_PROMO_LAST_SHOWN_KEY, String(Date.now()));
      setShowAndroidPromo(true);
      hideTimer = window.setTimeout(() => setShowAndroidPromo(false), ANDROID_PROMO_VISIBLE_MS);
    }, ANDROID_PROMO_DELAY_MS);

    return () => {
      window.clearTimeout(showTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isAuthenticated, loading, nativeAndroidInstalled]);

  const installKivryn = async () => {
    const prompt = deferredInstall;
    if (!prompt) return;

    setShowInstall(false);
    await prompt.prompt();
    const choice = await prompt.userChoice;

    // The captured prompt can only be used once. If the user declines, the
    // browser may make the site installable again on a future visit; the next
    // beforeinstallprompt event will repopulate this state.
    setDeferredInstall(null);
    if (choice.outcome === "accepted") {
      setShowAndroidPromo(false);
    }
  };

  if (loading || !isAuthenticated) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-3 z-[90] w-[min(390px,calc(100vw-1.5rem))] sm:bottom-6 sm:right-6"
      aria-live="polite"
    >
      {showInstall && deferredInstall && !installed ? (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-[#080b10]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <img
            src="/icon-192.png"
            alt=""
            aria-hidden="true"
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {portuguese ? "Instalar KIVRYN" : "Install KIVRYN"}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {portuguese
                ? "Acesso rápido e experiência em tela cheia."
                : "Quick access with a full-screen app experience."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void installKivryn()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {portuguese ? "Instalar" : "Install"}
          </button>
          <button
            type="button"
            onClick={() => setShowInstall(false)}
            aria-label={portuguese ? "Fechar" : "Close"}
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : showAndroidPromo ? (
        <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#080b10]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Smartphone className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {portuguese ? "Versão Android em desenvolvimento" : "Android version in development"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {portuguese
                  ? "A versão nativa já está no Google Play e continua recebendo melhorias."
                  : "The native app is already on Google Play and continues to receive improvements."}
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
              >
                {portuguese ? "Ver no Google Play" : "View on Google Play"}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <button
              type="button"
              onClick={() => setShowAndroidPromo(false)}
              aria-label={portuguese ? "Fechar" : "Close"}
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
