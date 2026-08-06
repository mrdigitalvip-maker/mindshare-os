import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { MODULES } from "@/lib/modules";
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
      results.reduce<Record<SearchCategory, typeof results>>(
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
        {!isFetching && normalized.length < 2 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Type at least two characters to search.
          </div>
        )}
        {!isFetching && normalized.length >= 2 && (
          <CommandEmpty>No results found in your workspace.</CommandEmpty>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <CommandGroup key={category} heading={category as SearchCategory}>
            {items.map((result) => {
              const module = MODULES.find((item) => item.path === result.path) ?? MODULES[0];
              const Icon = module.icon;
              return (
                <CommandItem
                  key={`${result.category}-${result.id}`}
                  value={`${result.title} ${result.description}`}
                  onSelect={() => {
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
