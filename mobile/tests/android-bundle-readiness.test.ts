import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("Metro includes the workspace contracts imported by the Android app", () => {
  const config = readFileSync("metro.config.js", "utf8");
  expect(config).toContain('path.resolve(projectRoot, "..")');
  expect(config).toContain("config.watchFolders = [workspaceRoot]");
});
