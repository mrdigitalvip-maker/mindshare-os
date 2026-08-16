import { supabase } from "@/lib/supabase";

export async function getRequiredUserId(): Promise<string> {
  // Route queries used to make a fresh auth network request even though the
  // shell had already restored a valid session. On cold navigation that second
  // request could transiently fail and reject every module query. Prefer the
  // locally restored session; database RLS still authorizes every operation.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("An authenticated user is required for this operation.");
  return data.user.id;
}

export function throwUnsyncedSchema(feature: string, tables: string[]): never {
  throw new Error(
    `${feature} is unavailable until local Supabase types are regenerated for: ${tables.join(", ")}.`,
  );
}
