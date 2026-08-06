import { DEMO_MODE } from "@/lib/demo/config";
import { throwUnsyncedSchema } from "./supabase-service";

export const SettingsService = {
  getNotificationDefaults() {
    if (!DEMO_MODE) return throwUnsyncedSchema("User preferences", ["user_preferences"]);
    return { dailyBriefing: true, goalReminders: true };
  },
};
