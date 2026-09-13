import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/providers/auth-provider";
import {
  lastNDays,
  readUsageHistory,
  recordUsage,
  type UsageDay,
} from "@/services/usage-analytics-service";

const FLUSH_INTERVAL_MS = 30_000;

export function useUsageTracker() {
  const userId = useAuth().session?.user.id ?? "";
  const activeSince = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    const startSession = () => {
      if (activeSince.current !== null) return;
      activeSince.current = Date.now();
      void recordUsage(userId, 0, { incrementSession: true });
    };

    const flush = () => {
      if (activeSince.current === null) return;
      const now = Date.now();
      const seconds = Math.floor((now - activeSince.current) / 1000);
      if (seconds > 0) void recordUsage(userId, seconds);
      activeSince.current = now;
    };

    if (AppState.currentState === "active") startSession();

    const interval = setInterval(() => {
      if (appState.current === "active") flush();
    }, FLUSH_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (next) => {
      const previous = appState.current;
      appState.current = next;
      if (previous === "active" && next !== "active") {
        flush();
        activeSince.current = null;
      } else if (previous !== "active" && next === "active") {
        startSession();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      flush();
      activeSince.current = null;
    };
  }, [userId]);
}

export function useUsageAnalytics(days = 7) {
  const userId = useAuth().session?.user.id ?? "";
  const [history, setHistory] = useState<UsageDay[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    const stored = await readUsageHistory(userId);
    setHistory(stored);
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const interval = setInterval(() => void refresh(), FLUSH_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  const series = lastNDays(history, days);
  const today = series.at(-1) ?? { date: "", activeSeconds: 0, sessions: 0 };
  const weekSeconds = series.reduce((total, item) => total + item.activeSeconds, 0);
  const weekSessions = series.reduce((total, item) => total + item.sessions, 0);

  return { series, today, weekSeconds, weekSessions, loading, refresh };
}
