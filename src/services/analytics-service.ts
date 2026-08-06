import { readMockDatabase } from "./local-store";

export const AnalyticsService = {
  getDashboardSnapshot() {
    const database = readMockDatabase();
    const openTasks = database.tasks.filter((task) => task.status === "open").length;
    return {
      productivity: 94,
      goals: database.financeGoals.length + database.studies.length + database.projects.length,
      aiUsage: 184,
      streak: "18 Days",
      openTasks,
    };
  },
};
