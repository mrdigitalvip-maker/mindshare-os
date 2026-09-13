import AsyncStorage from "@react-native-async-storage/async-storage";

export type UsageDay = {
  date: string;
  activeSeconds: number;
  sessions: number;
};

const VERSION = "v1";
const MAX_DAYS = 45;
let writeQueue = Promise.resolve();

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storageKey(userId: string) {
  return `kivryn:usage:${VERSION}:${userId}`;
}

function normalize(raw: unknown): UsageDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = item as Partial<UsageDay>;
      return {
        date: typeof value.date === "string" ? value.date : "",
        activeSeconds: Math.max(0, Math.round(Number(value.activeSeconds) || 0)),
        sessions: Math.max(0, Math.round(Number(value.sessions) || 0)),
      };
    })
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_DAYS);
}

export async function readUsageHistory(userId: string): Promise<UsageDay[]> {
  if (!userId.trim()) return [];
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function recordUsage(
  userId: string,
  activeSeconds: number,
  options?: { incrementSession?: boolean; at?: Date },
): Promise<void> {
  if (!userId.trim()) return Promise.resolve();
  const seconds = Math.max(0, Math.min(60 * 60, Math.round(activeSeconds)));
  const date = localDateKey(options?.at ?? new Date());
  writeQueue = writeQueue.then(async () => {
    const history = await readUsageHistory(userId);
    const current = history.find((item) => item.date === date) ?? {
      date,
      activeSeconds: 0,
      sessions: 0,
    };
    current.activeSeconds += seconds;
    if (options?.incrementSession) current.sessions += 1;
    const next = [...history.filter((item) => item.date !== date), current]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-MAX_DAYS);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  });
  return writeQueue;
}

export function lastNDays(history: UsageDay[], count: number, now = new Date()): UsageDay[] {
  const byDate = new Map(history.map((item) => [item.date, item]));
  const result: UsageDay[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = localDateKey(date);
    result.push(byDate.get(key) ?? { date: key, activeSeconds: 0, sessions: 0 });
  }
  return result;
}

export function formatUsageDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
