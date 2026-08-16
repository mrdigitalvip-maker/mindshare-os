import "react-native-url-polyfill/auto";

import { AppState, type AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(url && publishableKey);

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  url ?? "https://configuration-required.invalid",
  publishableKey ?? "configuration-required",
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

let authRefreshSubscription: { remove(): void } | undefined;

export function installAuthRefreshLifecycle(): () => void {
  if (authRefreshSubscription) return () => undefined;
  const update = (state: AppStateStatus) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  update(AppState.currentState);
  authRefreshSubscription = AppState.addEventListener("change", update);
  return () => {
    authRefreshSubscription?.remove();
    authRefreshSubscription = undefined;
    supabase.auth.stopAutoRefresh();
  };
}
