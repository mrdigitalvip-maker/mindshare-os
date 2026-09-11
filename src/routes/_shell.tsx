import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { RELEASE_MODULES } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FullPageLoader } from "@/components/full-page-loader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/global-search";
import { NotificationCenter } from "@/components/notification-center";
import { useLanguage } from "@/providers/language-provider";
import type { TranslationKey } from "@/i18n";

const SIDEBAR_STORAGE_KEY = "nexora.web.sidebar.v1";
const navigationGroups = [
  { id: "command", modules: ["dashboard", "assistant", "search"] },
  { id: "execute", modules: ["projects", "productivity"] },
  { id: "learn", modules: ["studies", "journeys", "packs"] },
  { id: "create", modules: ["creator"] },
  { id: "connect", modules: ["community", "arena"] },
  { id: "system", modules: ["premium", "settings"] },
] as const;

export const Route = createFileRoute("/_shell")({
  ssr: false,
  component: ShellLayout,
});

function initials(name?: string | null) {
  if (!name) return "N";
  return name.trim()[0]?.toUpperCase() ?? "N";
}

function ShellLayout() {
  const { t } = useLanguage();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: retryProfile,
  } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "compact",
  );

  // Guard 1: real Supabase session (replaces the old "nexora.session"
  // localStorage flag, which was never written anywhere).
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Guard 2: onboarding must be completed before any protected module is
  // reachable. Single source of truth — every route nested under this
  // layout goes through it.
  useEffect(() => {
    if (!authLoading && isAuthenticated && !profileLoading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [authLoading, isAuthenticated, profileLoading, profile, navigate]);

  const ready = !authLoading && isAuthenticated && !profileLoading && !!profile?.onboarded;

  if (!authLoading && isAuthenticated && profileError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-3xl">{t("shell.profileError")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("shell.profileErrorHelp")}</p>
          <Button className="mt-6 rounded-full" onClick={() => void retryProfile()}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <FullPageLoader />;
  }

  const displayName = profile?.full_name ?? user?.name ?? undefined;

  async function handleSignOut() {
    try {
      await signOut();
      queryClient.clear();
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } catch {
      toast.error(t("shell.signOutError"));
    }
  }

  const Sidebar = (
    <aside className="command-sidebar flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <img src="/nexora-icon.png" alt="" width={26} height={26} className="rounded-md" />
        {!compact && (
          <div>
            <span className="block font-display text-xl leading-none">KIVRYN</span>
            <span className="text-[9px] uppercase tracking-[.22em] text-muted-foreground">
              {t("shell.commandCenter")}
            </span>
          </div>
        )}
      </div>
      <nav className="scrollbar-hidden flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {navigationGroups.map((group) => {
          const groupModules = group.modules
            .map((id) => RELEASE_MODULES.find((module) => module.id === id))
            .filter(Boolean);
          return (
            groupModules.length > 0 && (
              <div key={group.id}>
                {!compact && (
                  <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {t(`nav.group.${group.id}` as TranslationKey)}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {groupModules.map((m) => {
                    if (!m) return null;
                    const active = pathname.startsWith(m.path);
                    if (m.id === "search") {
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setMobileOpen(false);
                              setSearchOpen(true);
                            }}
                            title={compact ? t(`nav.${m.id}` as TranslationKey) : undefined}
                            aria-label={t(`nav.${m.id}` as TranslationKey)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <m.icon className="h-4 w-4" />
                            {!compact && <span>{t(`nav.${m.id}` as TranslationKey)}</span>}
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={m.id}>
                        <Link
                          to={m.path}
                          title={compact ? t(`nav.${m.id}` as TranslationKey) : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? "bg-sidebar-accent text-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                          }`}
                        >
                          <m.icon className="h-4 w-4 shrink-0" />
                          {!compact && (
                            <span className="flex-1">{t(`nav.${m.id}` as TranslationKey)}</span>
                          )}
                          {!compact && m.premium && (
                            <span className="rounded-full border border-intelligence/25 bg-intelligence/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-intelligence">
                              Pro
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          );
        })}
      </nav>
      <button
        type="button"
        className="mx-3 mb-4 hidden items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:flex"
        onClick={() => {
          const next = !compact;
          setCompact(next);
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "compact" : "expanded");
        }}
        aria-label={compact ? t("shell.expand") : t("shell.collapse")}
      >
        {compact ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span>{t("shell.collapse")}</span>
          </>
        )}
      </button>
    </aside>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Desktop sidebar */}
      <div
        className={`hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block ${compact ? "w-[76px]" : "w-64"}`}
      >
        {Sidebar}
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — extra top padding accounts for the iOS status bar / notch
            when the app runs standalone (installed PWA). */}
        <header
          className="sticky top-0 z-30 border-b border-border bg-background/70 px-4 backdrop-blur md:px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex h-16 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 border-r border-sidebar-border bg-sidebar p-0"
              >
                {Sidebar}
              </SheetContent>
            </Sheet>

            <button
              onClick={() => setSearchOpen(true)}
              aria-label={t("shell.searchLabel")}
              className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-left text-sm text-muted-foreground transition hover:border-foreground/20 md:max-w-md"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1">{t("shell.search")}</span>
              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-sm font-medium"
                    aria-label={t("shell.accountMenu")}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{displayName ?? "Explorer"}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    <User className="mr-2 h-4 w-4" /> {t("shell.profileSettings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> {t("shell.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          <Outlet />
        </main>

        {/* Bottom nav (mobile) — extra bottom padding accounts for the home
            indicator on notched devices. */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/80 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5">
            {[
              { id: "dashboard", label: t("nav.dashboard"), path: "/dashboard", icon: Home },
              RELEASE_MODULES.find((module) => module.id === "assistant")!,
              RELEASE_MODULES.find((module) => module.id === "projects")!,
              {
                ...RELEASE_MODULES.find((module) => module.id === "productivity")!,
                label: t("nav.productivity"),
              },
            ].map((m) => {
              const active = pathname.startsWith(m.path);
              return (
                <Link
                  key={m.id}
                  to={m.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${
                    active ? "text-intelligence" : "text-muted-foreground"
                  }`}
                >
                  <m.icon className="h-5 w-5" />
                  <span>{m.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
              aria-label={t("shell.moreLabel")}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>{t("shell.more")}</span>
            </button>
          </div>
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
