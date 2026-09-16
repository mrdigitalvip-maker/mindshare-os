import { ProductivityService as WorkspaceProductivityService } from "./workspace-services";

// React Query receives mutation functions as bare callbacks. Keeping the calls
// as member expressions preserves the service object as `this` for methods such
// as toggleTask, which delegates to listTasks/updateTask internally.
export const ProductivityService = {
  listTasks: (...args: Parameters<typeof WorkspaceProductivityService.listTasks>) =>
    WorkspaceProductivityService.listTasks(...args),
  createTask: (...args: Parameters<typeof WorkspaceProductivityService.createTask>) =>
    WorkspaceProductivityService.createTask(...args),
  updateTask: (...args: Parameters<typeof WorkspaceProductivityService.updateTask>) =>
    WorkspaceProductivityService.updateTask(...args),
  toggleTask: (...args: Parameters<typeof WorkspaceProductivityService.toggleTask>) =>
    WorkspaceProductivityService.toggleTask(...args),
  removeTask: (...args: Parameters<typeof WorkspaceProductivityService.removeTask>) =>
    WorkspaceProductivityService.removeTask(...args),
};
