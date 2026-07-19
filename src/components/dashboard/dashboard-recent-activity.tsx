import { DASHBOARD_ACTIVITY } from "@/lib/dashboard-data";

export function DashboardRecentActivity() {
  return (
    <section className="rounded-3xl border border-border bg-surface p-6">
      <h2 className="font-display text-2xl">Recent Activity</h2>

      <div className="mt-6 space-y-5">
        {DASHBOARD_ACTIVITY.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[color:var(--gold)]" />
            <div className="flex-1">
              <h3 className="text-sm font-medium">{activity.title}</h3>
              <span className="mt-2 block text-xs text-muted-foreground">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
