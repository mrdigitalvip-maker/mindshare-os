import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(p, "utf8");
describe("NXR-035 Android UX contracts", () => {
  test("auth gate redirects instead of exposing protected history", () =>
    expect(read("app/(app)/_layout.tsx")).toContain('Redirect href="/auth"'));
  test("dynamic Creator route validates scalar non-empty id", () => {
    const source = read("app/(app)/creator/[projectId].tsx");
    expect(source).toMatch(/typeof params\.projectId\s*===\s*"string"/);
    expect(source).toContain("creator.invalidRoute");
  });
  test("community stays headerless and Creator names are explicit", () => {
    const layout = read("app/(app)/_layout.tsx");
    expect(layout).toContain('name="community" options={{ headerShown: false }}');
    expect(layout).toContain('name="creator/[projectId]"');
  });
  test("keyboard-safe scrolling retains submit access", () => {
    const screen = read("components/app-screen.tsx");
    expect(screen).toContain('keyboardShouldPersistTaps="handled"');
    expect(screen).toContain('Platform.OS === "ios" ? "padding" : undefined');
  });
  test("technical route groups are not used as visible titles", () => {
    const layout = read("app/(app)/_layout.tsx");
    expect(layout).not.toMatch(/title:\s*["'`](\(app\)|\(tabs\)|\[[^\]]+\])/);
  });
});
