import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { LoadingState } from "@/components/screen-state";
export default function Callback() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  useEffect(() => {
    const destination = next === "/auth/reset-password" ? next : "/dashboard";
    const timer = setTimeout(() => router.replace(destination), 250);
    return () => clearTimeout(timer);
  }, [next]);
  return <LoadingState title="Securing your session…" />;
}
