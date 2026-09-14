import { supabase } from "@/lib/supabase";

let requiredUserIdRequest: Promise<string> | null = null;

async function resolveRequiredUserId(): Promise<string> {
  // Prefer the locally restored session. Several dashboard modules can mount at
  // once after OAuth/cold navigation; sharing one auth resolution avoids a burst
  // of competing session reads while the browser storage lock is settling.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  // A transient getSession failure should not make every module fail together.
  // getUser performs the authoritative fallback before we surface an auth error.
  const { data, error } = await supabase.auth.getUser();
  if (data.user?.id) return data.user.id;
  if (error) throw error;
  if (sessionError) throw sessionError;
  throw new Error("An authenticated user is required for this operation.");
}

export function getRequiredUserId(): Promise<string> {
  if (!requiredUserIdRequest) {
    requiredUserIdRequest = resolveRequiredUserId().finally(() => {
      requiredUserIdRequest = null;
    });
  }
  return requiredUserIdRequest;
}

export function throwUnsyncedSchema(feature: string, tables: string[]): never {
  throw new Error(
    `${feature} is unavailable until local Supabase types are regenerated for: ${tables.join(", ")}.`,
  );
}
