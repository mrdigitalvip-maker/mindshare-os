import { DEMO_MODE } from "@/lib/demo/config";
import { supabase } from "@/lib/supabase";
import { readMockDatabase } from "./local-store";
import { getRequiredUserId } from "./supabase-service";

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: string | null;
};

export const NotificationService = {
  async list(): Promise<NotificationRecord[]> {
    if (DEMO_MODE)
      return readMockDatabase().notifications.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.body,
        createdAt: new Date().toISOString(),
        isRead: item.read,
        type: null,
      }));
    const userId = await getRequiredUserId();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, created_at, is_read, type")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Notification",
      message: row.message ?? "",
      createdAt: row.created_at ?? new Date(0).toISOString(),
      isRead: row.is_read === true,
      type: row.type,
    }));
  },
  async markRead(id: string): Promise<void> {
    if (DEMO_MODE) return;
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
  async markAllRead(): Promise<void> {
    if (DEMO_MODE) return;
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    if (DEMO_MODE) return;
    const userId = await getRequiredUserId();
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
};
