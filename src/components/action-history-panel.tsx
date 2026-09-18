import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { ActionHistoryService } from "@/services/action-history-service";

const actionLabel: Record<string, string> = {
  create_task: "Task created",
  update_task: "Task updated",
  reschedule_task: "Task rescheduled",
  complete_task: "Task completed",
  set_task_next_action: "Task next action updated",
  set_task_blocker: "Task blocker set",
  clear_task_blocker: "Task blocker cleared",
  create_project: "Project created",
  update_project: "Project updated",
  complete_project: "Project completed",
  add_task_to_project: "Task added to project",
  create_study_goal: "Study goal created",
  update_study_goal: "Study goal updated",
  set_subject_next_action: "Study next action updated",
  send_email: "Email sent",
  create_calendar_event: "Calendar event created",
  create_drive_text_file: "Drive text file created",
};

const domainLabel = {
  tasks: "Tasks",
  projects: "Projects",
  studies: "Studies",
  integrations: "Integrations",
  other: "Workspace",
} as const;

export function ActionHistoryPanel() {
  const history = useQuery({
    queryKey: ["workspace", "action-history", 8],
    queryFn: () => ActionHistoryService.list(8),
    staleTime: 15_000,
  });

  return (
    <section className="glass rounded-2xl p-5" aria-label="Action history">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4 text-gold" />
            Action history
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Owner-scoped audit trail of workspace mutations executed by KIVRYN.
          </p>
        </div>
        <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Persistent
        </span>
      </div>

      {history.isPending && <p className="mt-4 text-sm text-muted-foreground">Loading history…</p>}
      {history.isError && (
        <button
          type="button"
          className="mt-4 text-sm text-gold underline underline-offset-4"
          onClick={() => void history.refetch()}
        >
          Retry history
        </button>
      )}
      {history.isSuccess && history.data.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No workspace actions have been applied yet.
        </p>
      )}
      {!!history.data?.length && (
        <div className="mt-4 divide-y divide-border/60">
          {history.data.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {actionLabel[item.actionType] ?? item.actionType.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {domainLabel[item.domain]} · {new Date(item.appliedAt ?? item.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-wide ${
                  item.status === "failed"
                    ? "border-destructive/40 text-destructive"
                    : item.status === "uncertain"
                      ? "border-amber-500/40 text-amber-600"
                      : item.status === "applying"
                        ? "text-muted-foreground"
                        : "border-gold/30 text-gold"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
