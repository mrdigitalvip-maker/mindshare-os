import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nexora:sanitized-crashes";
type CrashEvent = { diagnosticId: string; occurredAt: string; category: "application" };

export async function persistSanitizedCrash(diagnosticId: string): Promise<void> {
  const event: CrashEvent = {
    diagnosticId,
    occurredAt: new Date().toISOString(),
    category: "application",
  };
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const parsed = current ? (JSON.parse(current) as CrashEvent[]) : [];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...parsed.slice(-9), event]));
}
