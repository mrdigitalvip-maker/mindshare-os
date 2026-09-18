import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modulesPath = new URL("../src/lib/modules.ts", import.meta.url);
const shellPath = new URL("../src/routes/_shell.tsx", import.meta.url);
const projectsPath = new URL("../src/routes/_shell.projects.tsx", import.meta.url);
const packsPath = new URL("../src/routes/_shell.packs.tsx", import.meta.url);
const migrationPath = new URL(
  "../supabase/migrations/20260917114000_phase1_preflight_runtime_and_rpc_hardening.sql",
  import.meta.url,
);

test("Documents is release-ready and discoverable in the execution navigation", async () => {
  const [modules, shell] = await Promise.all([
    readFile(modulesPath, "utf8"),
    readFile(shellPath, "utf8"),
  ]);
  assert.match(modules, /id:\s*"documents",\s*\n\s*releaseReady:\s*true/);
  assert.match(shell, /modules:\s*\["projects",\s*"productivity",\s*"documents"\]/);
});

test("Project rows use explicit router navigation instead of a dynamic Link tap target", async () => {
  const source = await readFile(projectsPath, "utf8");
  assert.match(source, /const navigate = useNavigate\(\)/);
  assert.match(source, /to:\s*"\/projects\/\$projectId"/);
  assert.match(source, /params:\s*\{ projectId: project\.id \}/);
  assert.match(source, /aria-label=\{`Abrir projeto \$\{project\.title\}`\}/);
});

test("Journey Pack cards use explicit router navigation for the Ver Pack action", async () => {
  const source = await readFile(packsPath, "utf8");
  assert.match(source, /const navigate = useNavigate\(\)/);
  assert.match(source, /to:\s*"\/packs\/\$slug"/);
  assert.match(source, /params:\s*\{ slug: p\.slug \}/);
  assert.match(source, /L\("Ver Pack", "View Pack"\)/);
});

test("Agent observability constraints accept E17 Documents context and internal helpers are not client RPCs", async () => {
  const source = await readFile(migrationPath, "utf8");
  assert.match(source, /'documents'/);
  assert.match(source, /'workspace\.documents'/);
  assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.apply_verified_mission_effects/);
  assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.complete_verified_missions\(\)/);
  assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.ensure_passport_language_track\(\)/);
  assert.match(source, /REVOKE EXECUTE ON FUNCTION public\.complete_passport_placement/);
});
