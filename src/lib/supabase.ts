import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

import { hasSupabaseCredentials } from "@/lib/demo/config";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!hasSupabaseCredentials) {
  console.warn("[nexora] Missing Supabase environment variables.");
}

// `createClient` throws when the URL is empty, which would blank the whole
// app. Use an inert placeholder so imports stay safe; every call site is
// guarded by the demo fallback layer.
const PLACEHOLDER_URL = "https://demo.supabase.co";
const PLACEHOLDER_KEY = "public-anon-key-placeholder";

// Realtime is browser-only in this frontend. Supabase eagerly resolves its
// WebSocket constructor, so provide an inert SSR constructor to keep route
// rendering compatible with Node runtimes that do not expose WebSocket.
const serverRealtimeTransport = class ServerRealtimeTransport {} as typeof WebSocket;

export const supabase = createClient<Database>(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: typeof window === "undefined" ? { transport: serverRealtimeTransport } : undefined,
  },
);

export { hasSupabaseCredentials };
