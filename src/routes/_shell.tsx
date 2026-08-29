import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, LogOut, Menu, MoreHorizontal, Search, User } from "lucide-react";
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

export const Route = createFileRoute("/_shell")({
  ssr: false,
  component: ShellLayout,
});

function initials(name?: string | null) {
  if (!name) return "N";
  return name.trim()[0]?.toUpperCase() ?? "N";
}

function ShellLayout() {
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
          <h1 className="font-display text-3xl">Não foi possível carregar seu perfil</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente. Seus dados continuam seguros.
          </p>
          <Button className="mt-6 rounded-full" onClick={() => void retryProfile()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <FullPageLoader />;
  }

  const displayName = profile?.full_name ?? user?.name ?? undefined;

  const groups = {
    main: RELEASE_MODULES.filter((m) => m.category === "main"),
    workspace: RELEASE_MODULES.filter((m) => m.category === "workspace"),
    growth: RELEASE_MODULES.filter((m) => m.category === "growth"),
    intelligence: RELEASE_MODULES.filter((m) => m.category === "intelligence"),
    money: RELEASE_MODULES.filter((m) => m.category === "money"),
    account: RELEASE_MODULES.filter((m) => m.category === "account"),
  };

  async function handleSignOut() {
    try {
      await signOut();
      queryClient.clear();
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } catch {
      toast.error("Não foi possível sair. Verifique sua conexão e tente novamente.");
    }
  }

  const Sidebar = (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
        <img src="/nexora-icon.png" alt="" width={26} height={26} className="rounded-md" />
        <span className="font-display text-xl">NEXORA</span>
      </div>
      <nav className="scrollbar-hidden flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {(["main", "workspace", "growth", "intelligence", "money", "account"] as const).map(
          (g) =>
            groups[g].length > 0 && (
              <div key={g}>
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {g}
                </p>
                <ul className="space-y-0.5">
                  {groups[g].map((m) => {
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
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <m.icon className="h-4 w-4" />
                            <span>{m.label}</span>
                          </button>
                        </li>
                      );
                    }
                    return (
                      <li key={m.id}>
                        <Link
                          to={m.path}
                          onClick={() => setMobileOpen(false)}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? "bg-sidebar-accent text-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                          }`}
                        >
                          <m.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{m.label}</span>
                          {m.premium && (
                            <span className="rounded-full bg-[color:var(--gold)]/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-gold">
                              Pro
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
        )}
      </nav>
    </aside>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">{Sidebar}</div>

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
              className="flex flex-1 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-left text-sm text-muted-foreground transition hover:border-foreground/20 md:max-w-md"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1">Search or ask NEXORA…</span>
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
                    aria-label="Account menu"
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
                    <User className="mr-2 h-4 w-4" /> Profile & settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
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
              { id: "dashboard", label: "Home", path: "/dashboard", icon: Home },
              RELEASE_MODULES.find((module) => module.id === "assistant")!,
              RELEASE_MODULES.find((module) => module.id === "projects")!,
              {
                ...RELEASE_MODULES.find((module) => module.id === "productivity")!,
                label: "Tasks",
              },
            ].map((m) => {
              const active = pathname.startsWith(m.path);
              return (
                <Link
                  key={m.id}
                  to={m.path}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${
                    active ? "text-gold" : "text-muted-foreground"
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
              aria-label="Open more modules"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
