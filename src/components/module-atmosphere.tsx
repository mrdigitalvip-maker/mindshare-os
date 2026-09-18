import { useLocation } from "@tanstack/react-router";

export function ModuleAtmosphere() {
  const location = useLocation();
  const creator = location.pathname.startsWith("/creator");

  // Phase 2: Creator owns all actionable AI controls inside its workspace.
  // Keep atmosphere decorative only so nothing fixed can cover content or
  // survive navigation as an interactive overlay on small screens.
  if (!creator) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -right-28 top-8 h-80 w-80 rounded-full bg-[#ff6bc9]/[0.035] blur-3xl" />
      <div className="absolute -left-32 top-[38%] h-72 w-72 rounded-full bg-[#8d7cff]/[0.03] blur-3xl" />
    </div>
  );
}
