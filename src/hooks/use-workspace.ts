import { useCallback, useEffect, useState } from "react";
import {
  loadWorkspaceState,
  saveWorkspaceState,
  type WorkspaceState,
} from "@/lib/workspace-service";

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(() => loadWorkspaceState());

  useEffect(() => {
    saveWorkspaceState(state);
  }, [state]);

  const update = useCallback((recipe: (state: WorkspaceState) => WorkspaceState) => {
    setState((current) => recipe(current));
  }, []);

  return { state, update };
}
