import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { readMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export const NotificationService = {
  async list(): Promise<NotificationRecord[]> {
    if (DEMO_MODE)
      return readMockDatabase().notifications.map((item) => ({
        ...item,
        message: "",
        createdAt: new Date().toISOString(),
        readAt: null,
      }));
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Notification",
      message: row.message ?? "",
      createdAt: row.created_at ?? new Date(0).toISOString(),
      readAt: row.read_at,
    }));
  },
  async markRead(id: string): Promise<void> {
    if (DEMO_MODE) return;
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async unreadCount(): Promise<number> {
    if (DEMO_MODE) return readMockDatabase().notifications.length;
    const userId = await getRequiredUserId();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw error;
    return count ?? 0;
  },
};
