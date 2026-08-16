import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Clock3, Loader2, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { RELEASE_MODULES } from "@/lib/modules";
import { SearchService, workspaceQueryKeys, type SearchCategory } from "@/services";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const normalized = query.trim();
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("nexora-search-recent") ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const {
    data: results = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: workspaceQueryKeys.search(user?.id, normalized),
    queryFn: () => SearchService.search(normalized),
    enabled: open && normalized.length >= 2,
    staleTime: 30_000,
  });
  const grouped = useMemo(
    () =>
      results
        .filter((result) =>
          RELEASE_MODULES.some(
            (module) => result.path === module.path || result.path.startsWith(`${module.path}/`),
          ),
        )
        .reduce<Record<SearchCategory, typeof results>>(
          (groups, result) => {
            (groups[result.category] ??= []).push(result);
            return groups;
          },
          {} as Record<SearchCategory, typeof results>,
        ),
    [results],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5" /> Command center
        </span>
        <kbd className="rounded border px-1.5 py-0.5">⌘ K</kbd>
      </div>
      <CommandInput placeholder="Search your workspace…" value={query} onValueChange={setQuery} />
      <CommandList>
        {isFetching && (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching your workspace
          </div>
        )}
        {isError && (
          <div className="p-6 text-center text-sm text-destructive">
            Search could not be completed. Please try again.
          </div>
        )}
        {!isFetching &&
          normalized.length < 2 &&
          (recent.length ? (
            <CommandGroup heading="Recent searches">
              {recent.map((item) => (
                <CommandItem key={item} onSelect={() => setQuery(item)}>
                  <Clock3 className="mr-2 h-4 w-4" />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Search projects, studies, finance, conversations and more.
            </div>
          ))}
        {!isFetching && normalized.length >= 2 && (
          <CommandEmpty>No results found in your workspace.</CommandEmpty>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <CommandGroup key={category} heading={category as SearchCategory}>
            {items.map((result) => {
              const module =
                RELEASE_MODULES.find(
                  (item) => result.path === item.path || result.path.startsWith(`${item.path}/`),
                ) ?? RELEASE_MODULES[0];
              const Icon = module.icon;
              return (
                <CommandItem
                  key={`${result.category}-${result.id}`}
                  value={`${result.title} ${result.description}`}
                  onSelect={() => {
                    const next = [
                      normalized,
                      ...recent.filter((item) => item !== normalized),
                    ].slice(0, 5);
                    setRecent(next);
                    sessionStorage.setItem("nexora-search-recent", JSON.stringify(next));
                    onOpenChange(false);
                    navigate({ to: result.path });
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="truncate">{result.title}</span>
                  <span className="ml-auto max-w-40 truncate text-xs text-muted-foreground">
                    {result.description}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
