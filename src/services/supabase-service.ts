import { supabase } from "@/lib/supabase";

export async function getRequiredUserId(): Promise<string> {
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
