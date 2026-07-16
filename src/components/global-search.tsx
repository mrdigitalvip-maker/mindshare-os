import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
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

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

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
      <CommandInput placeholder="Search modules, ask anything…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Modules">
          {MODULES.map((m) => (
            <CommandItem
              key={m.id}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: m.path });
              }}
            >
              <m.icon className="mr-2 h-4 w-4" />
              <span>{m.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{m.description}</span>
            </CommandItem>
          ))}
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
