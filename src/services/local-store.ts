import { mockDatabase, type MockDatabase } from "./mock-data";
import { DEMO_MODE } from "@/lib/demo/config";

const STORAGE_KEY = "mindshare.services.mock.v1";

function assertDemoMode() {
  if (!DEMO_MODE) {
    throw new Error("Mock workspace services are available only when VITE_DEMO_MODE=true.");
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readMockDatabase(): MockDatabase {
  assertDemoMode();
  if (typeof localStorage === "undefined") return clone(mockDatabase);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...clone(mockDatabase), ...stored };
  } catch {
    return clone(mockDatabase);
  }
}

export function writeMockDatabase(database: MockDatabase) {
  assertDemoMode();
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  }
}

export function updateMockDatabase(recipe: (database: MockDatabase) => MockDatabase) {
  const next = recipe(readMockDatabase());
  writeMockDatabase(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("mindshare:mock-database-updated"));
  }
  return next;
}
