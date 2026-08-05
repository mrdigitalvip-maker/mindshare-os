import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { MODULES } from "@/lib/modules";
import { SearchService, type SearchResult } from "@/services/search-service";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void SearchService.search(query)
        .then((items) => {
          if (active) setResults(items);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setResults([]);
          toast.error(error instanceof Error ? error.message : "Search failed");
        });
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search modules, ask anything…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Modules">
          {results.map((result) => {
            const module = MODULES.find((item) => item.path === result.path) ?? MODULES[0];
            const Icon = module.icon;
            return (
              <CommandItem
                key={`${result.path}-${result.id}`}
                value={`${result.title} ${result.description}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: result.path });
                }}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{result.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{result.description}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/assistant" });
            }}
          >
            Start a new conversation
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/projects" });
            }}
          >
            Create a project
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
