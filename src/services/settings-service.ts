import { DEMO_MODE } from "@/lib/demo/config";
import { assertSupportedSchema } from "./supabase-service";

export const SettingsService = {
  getNotificationDefaults() {
    if (!DEMO_MODE) return assertSupportedSchema("User preferences", ["user_preferences"]);
    return { dailyBriefing: true, goalReminders: true };
  },
};
