import { mockDatabase, type MockDatabase } from "./mock-data";

const STORAGE_KEY = "mindshare.services.mock.v1";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readMockDatabase(): MockDatabase {
  if (typeof localStorage === "undefined") return clone(mockDatabase);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...clone(mockDatabase), ...stored };
  } catch {
    return clone(mockDatabase);
  }
}

export function writeMockDatabase(database: MockDatabase) {
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
