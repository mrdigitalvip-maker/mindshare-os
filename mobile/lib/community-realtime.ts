export type CommunityRealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

type Scheduler = {
  set(delay: number, callback: () => void): unknown;
  clear(handle: unknown): void;
};

const defaultScheduler: Scheduler = {
  set: (delay, callback) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Owns one channel subscription and bounds explicit recovery after terminal failures. */
export function createCommunityRealtimeLifecycle({
  subscribe,
  reconcile,
  status,
  scheduler = defaultScheduler,
  retryDelays = [1_000, 3_000, 8_000],
}: {
  subscribe: (onStatus: (value: CommunityRealtimeStatus) => void) => () => void;
  reconcile: () => void;
  status: (value: CommunityRealtimeStatus) => void;
  scheduler?: Scheduler;
  retryDelays?: number[];
}) {
  let active = false;
  let foreground = false;
  let generation = 0;
  let retries = 0;
  let cleanup: (() => void) | undefined;
  let retryTimer: unknown;

  const clearRetry = () => {
    if (retryTimer !== undefined) scheduler.clear(retryTimer);
    retryTimer = undefined;
  };
  const disconnect = () => {
    generation += 1;
    clearRetry();
    const current = cleanup;
    cleanup = undefined;
    current?.();
  };
  const connect = () => {
    if (!active || !foreground || cleanup) return;
    const ownGeneration = ++generation;
    status("connecting");
    cleanup = subscribe((value) => {
      if (!active || !foreground || ownGeneration !== generation) return;
      status(value);
      if (value === "connected") {
        retries = 0;
        reconcile();
        return;
      }
      if ((value === "error" || value === "disconnected") && !retryTimer) {
        const delay = retryDelays[retries++];
        if (delay === undefined) return;
        retryTimer = scheduler.set(delay, () => {
          retryTimer = undefined;
          if (!active || !foreground || ownGeneration !== generation) return;
          disconnect();
          connect();
        });
      }
    });
  };

  return {
    start(isForeground = true) {
      if (active) return;
      active = true;
      foreground = isForeground;
      if (foreground) connect();
      else status("disconnected");
    },
    setForeground(value: boolean) {
      if (!active || foreground === value) return;
      foreground = value;
      if (!foreground) {
        disconnect();
        status("disconnected");
      } else {
        retries = 0;
        reconcile();
        connect();
      }
    },
    stop() {
      if (!active) return;
      active = false;
      foreground = false;
      disconnect();
      status("disconnected");
    },
  };
}
