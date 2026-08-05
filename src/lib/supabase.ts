import { createClient } from "@supabase/supabase-js";

import { hasSupabaseCredentials } from "@/lib/demo/config";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!hasSupabaseCredentials) {
  // Avoid throwing at module import time so the app can still render (demo
  // mode) while credentials are being provisioned.
  console.warn(
    "[nexora] Missing Supabase environment variables — running in demo/fallback mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to go live.",
  );
}

// `createClient` throws when the URL is empty, which would blank the whole
// app. Use an inert placeholder so imports stay safe; every call site is
// guarded by the demo fallback layer.
const PLACEHOLDER_URL = "https://demo.supabase.co";
const PLACEHOLDER_KEY = "public-anon-key-placeholder";

export const supabase = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export { hasSupabaseCredentials };
