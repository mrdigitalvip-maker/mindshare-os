import { describe, expect, it } from "vitest";
import { KIVRYN_ACTION_REGISTRY } from "../supabase/functions/_shared/kivryn-action-registry";

const existingWorkspaceMutations = [
  "create_task", "update_task", "reschedule_task", "complete_task", "set_task_next_action", "set_task_blocker", "clear_task_blocker",
  "create_project", "update_project", "complete_project", "add_task_to_project",
  "create_study_goal", "update_study_goal", "set_subject_next_action",
] as const;

describe("Edition 9 legacy action compatibility", () => {
  it("uses existing action identifiers instead of inventing a parallel executor vocabulary", () => {
    expect(Object.keys(KIVRYN_ACTION_REGISTRY).sort()).toEqual([...existingWorkspaceMutations].sort());
  });
});
