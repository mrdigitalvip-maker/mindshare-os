import { Share } from "react-native";
import { supabase } from "@/lib/supabase";

export type CreatorExportResult = {
  signedUrl: string;
  fileName: string;
  expiresInSeconds: number;
  quota?: {
    entitlement?: "free" | "premium";
    unlimited?: boolean;
    limit?: number;
    used?: number;
    remaining?: number | null;
    resetAt?: string;
  };
};

export async function requestCreatorExport(clipId: string): Promise<CreatorExportResult> {
  const id = clipId.trim();
  if (!id) throw new Error("clip_required");
  const { data, error } = await supabase.functions.invoke("creator-export", {
    body: { clipId: id, requestId: crypto.randomUUID() },
  });
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("invalid_creator_export");
  const value = data as Partial<CreatorExportResult> & {
    error?: { code?: string } | string;
  };
  if (value.error) {
    throw new Error(typeof value.error === "string" ? value.error : value.error.code ?? "creator_export_failed");
  }
  if (typeof value.signedUrl !== "string" || typeof value.fileName !== "string") {
    throw new Error("invalid_creator_export");
  }
  return {
    signedUrl: value.signedUrl,
    fileName: value.fileName,
    expiresInSeconds: typeof value.expiresInSeconds === "number" ? value.expiresInSeconds : 300,
    quota: value.quota,
  };
}

export async function shareCreatorExport(clipId: string, message?: string) {
  const exported = await requestCreatorExport(clipId);
  await Share.share({
    title: exported.fileName,
    message: [message?.trim(), exported.signedUrl].filter(Boolean).join("\n\n"),
    url: exported.signedUrl,
  });
  return exported;
}
