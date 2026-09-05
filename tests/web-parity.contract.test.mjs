import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("protected shell redirects signed-out users and clears identity cache", async () => {
  const [shell, auth] = await Promise.all([
    read("src/routes/_shell.tsx"),
    read("src/lib/auth-context.tsx"),
  ]);
  assert.match(shell, /navigate\(\{ to: "\/auth"/);
  assert.match(auth, /cancelQueries\(\).*queryClient\.clear\(\)/s);
});

test("canonical parity routes and Daily Mission are wired", async () => {
  const [tree, service, home] = await Promise.all([
    read("src/routeTree.gen.ts"),
    read("src/services/parity-service.ts"),
    read("src/components/daily-mission-card.tsx"),
  ]);
  for (const route of [
    "/journeys",
    "/arena",
    "/community",
    "/packs",
    "/journeys/$journeyId",
    "/community/squads/$squadId",
    "/packs/$slug",
  ])
    assert.ok(tree.includes(route), route);
  assert.match(service, /ensure_daily_journey_mission/);
  assert.match(home, /queryFn: dailyMission/);
});

test("Community forms and server mutation contracts remain accessible", async () => {
  const [route, service] = await Promise.all([
    read("src/routes/_shell.community.tsx"),
    read("src/services/parity-service.ts"),
  ]);
  for (const semantic of [
    'aria-label="Perfil da comunidade"',
    'aria-label="Criar Squad"',
    'aria-label="Aceitar convite"',
  ])
    assert.ok(route.includes(semantic));
  for (const rpc of [
    "upsert_community_profile",
    "create_squad",
    "accept_squad_invite",
    "set_activity_reaction",
    "report_community_target",
  ])
    assert.ok(service.includes(rpc), rpc);
});

test("browser copy actions use the permission-safe clipboard adapter", async () => {
  const [adapter, ...routes] = await Promise.all([
    read("src/lib/clipboard.ts"),
    read("src/routes/_shell.assistant.tsx"),
    read("src/routes/_shell.dashboard.tsx"),
    read("src/routes/_shell.translate.tsx"),
    read("src/routes/_shell.agents.$agentId.tsx"),
    read("src/routes/_shell.community.squads.$squadId.tsx"),
  ]);
  assert.match(adapter, /navigator\.clipboard\?\.writeText/);
  assert.match(adapter, /document\.execCommand\("copy"\)/);
  for (const route of routes) {
    assert.match(route, /copyText/);
    assert.doesNotMatch(route, /navigator\.clipboard/);
  }
});

test("Journey and Pack creation are server persisted and duplicate-safe", async () => {
  const [journeys, pack, service] = await Promise.all([
    read("src/routes/_shell.journeys.tsx"),
    read("src/routes/_shell.packs.$slug.tsx"),
    read("src/services/parity-service.ts"),
  ]);
  assert.match(journeys, /createJourney/);
  assert.match(pack, /useRef\(crypto\.randomUUID\(\)\)/);
  assert.match(pack, /disabled=\{start\.isPending/);
  assert.match(service, /start_journey_pack/);
});

test("safe UI error fallback never exposes a raw backend message", async () => {
  const service = await read("src/services/parity-service.ts");
  assert.match(service, /safeBackendError/);
  assert.match(service, /Não foi possível concluir a solicitação/);
  assert.doesNotMatch(service, /return raw/);
});

test("web auth origin is isolated and production demo mode fails closed", async () => {
  const [destinations, auth, demo] = await Promise.all([
    read("src/lib/auth-destinations.ts"),
    read("src/lib/auth-context.tsx"),
    read("src/lib/demo/config.ts"),
  ]);
  assert.match(destinations, /oauth: "\/auth\/callback"/);
  assert.match(destinations, /emailConfirmation: "\/confirm-email"/);
  assert.match(destinations, /passwordRecovery: "\/reset-password"/);
  assert.doesNotMatch(destinations, /searchParams/);
  assert.match(auth, /webAuthDestination\("oauth", window\.location\.origin\)/);
  assert.match(demo, /import\.meta\.env\.DEV && rawFlag === "true"/);
});

test("web and native read the same canonical profile table", async () => {
  const [web, native] = await Promise.all([
    read("src/services/profile-service.ts"),
    read("mobile/services/profile-service.ts"),
  ]);
  assert.match(web, /\.from\("profiles"\)/);
  assert.match(native, /\.from\("profiles"\)/);
});

test("Creator Center is protected and exposes the complete compatibility loop", async () => {
  const [tree, route, shell] = await Promise.all([
    read("src/routeTree.gen.ts"),
    read("src/routes/_shell.creator.tsx"),
    read("src/routes/_shell.tsx"),
  ]);
  assert.match(tree, /'\/creator'/);
  assert.match(shell, /!isAuthenticated/);
  for (const section of ["CREATE", "PLAN", "LEARN", "ANALYZE", "INTELLIGENCE", "MEDIA", "AI"])
    assert.ok(route.includes(section), section);
  assert.match(route, /Idea → positioning → profile → strategy → content/);
});

test("Creator profile, pillars, strategy, Academy, and goals use canonical persistence", async () => {
  const service = await read("src/services/creator-service.ts");
  for (const table of [
    "creator_profiles",
    "creator_strategies",
    "creator_learning_progress",
    "creator_goals",
  ])
    assert.ok(service.includes(`from("${table}")`), table);
  assert.match(service, /content_pillars: value\.contentPillars/);
  assert.doesNotMatch(service, /localStorage/);
});

test("manual Creator evidence is owner-scoped, nullable, and append-only", async () => {
  const service = await read("src/services/creator-service.ts");
  for (const table of [
    "creator_content_log",
    "creator_manual_metric_snapshots",
    "creator_manual_country_observations",
  ])
    assert.ok(service.includes(`from("${table}")`), table);
  assert.match(service, /values\[metric\] === "" \? null : Number/);
  assert.match(service, /creator_manual_metric_snapshots"\)\.insert/);
  assert.match(service, /\.eq\("user_id", userId\)/);
});

test("Creator analytics and map never manufacture observations or best-time claims", async () => {
  const route = await read("src/routes/_shell.creator.tsx");
  assert.match(route, /Real observations only/);
  assert.match(route, /More observations are needed/);
  assert.match(route, /Manually entered data/);
  assert.match(route, /no benchmark data is\s+available yet/);
  assert.doesNotMatch(route, /fake|sample chart|mock metric/i);
});

test("Creator AI tools use only the canonical Assistant and have no local fallback", async () => {
  const route = await read("src/routes/_shell.creator.tsx");
  assert.match(route, /AIService\.sendChat/);
  assert.match(route, /Content Ideas/);
  assert.match(route, /Hook Lab/);
  assert.match(route, /Creator Copilot/);
  assert.match(route, /Assistant is unavailable right now/);
  assert.doesNotMatch(route, /Math\.random|generatedHooks|fakeFallback/);
});

test("Next Action is deterministic and Creator tasks remain canonical", async () => {
  const [domain, service] = await Promise.all([
    read("src/lib/creator.ts"),
    read("src/services/creator-service.ts"),
  ]);
  for (const action of [
    "Complete Creator Setup",
    "Build Content Strategy",
    "Add your first content",
    "Update manual analytics",
    "Review Creator Intelligence",
  ])
    assert.ok(domain.includes(action), action);
  assert.match(service, /TaskService\.createTask/);
});

test("Creator Library and Viral Clips use canonical private backend contracts", async () => {
  const [route, service] = await Promise.all([
    read("src/routes/_shell.creator.tsx"),
    read("src/services/creator-service.ts"),
  ]);
  for (const entity of ["creator_projects", "creator_jobs", "creator_clips"])
    assert.ok(service.includes(entity), entity);
  assert.match(service, /creator-sources/);
  assert.match(service, /enqueue_creator_job/);
  assert.match(service, /creator-outputs/);
  assert.match(route, /browser never runs FFmpeg/);
  assert.doesNotMatch(service, /ffmpeg|progress_percent:/i);
});

test("all cross-platform Creator entities remain shared with no Web duplicate schema", async () => {
  const [web, native, migrations] = await Promise.all([
    read("src/services/creator-service.ts"),
    read("mobile/services/creator-service.ts"),
    Promise.all([
      read("supabase/migrations/202609040001_creator_center_foundation.sql"),
      read("supabase/migrations/202609040002_creator_operating_center.sql"),
      read("supabase/migrations/202609040003_creator_interactive_product.sql"),
      read("supabase/migrations/202609040004_creator_video_engine.sql"),
      read("supabase/migrations/202609040005_creator_intelligence.sql"),
      read("supabase/migrations/202609040006_creator_standalone_copilot.sql"),
    ]).then((files) => files.join("\n")),
  ]);
  const entities = [
    "creator_profiles",
    "creator_strategies",
    "creator_learning_progress",
    "creator_goals",
    "creator_projects",
    "creator_jobs",
    "creator_clips",
    "creator_content_log",
    "creator_manual_metric_snapshots",
    "creator_manual_country_observations",
    "creator_analytics_snapshots",
    "creator_country_observations",
    "creator_platform_connections",
  ];
  for (const entity of entities) {
    assert.ok(web.includes(entity), `web ${entity}`);
    assert.ok(native.includes(entity) || migrations.includes(entity), `native/schema ${entity}`);
  }
});

test("standalone Creator mode requires no social credentials and missing resources are recoverable", async () => {
  const [route, service] = await Promise.all([
    read("src/routes/_shell.creator.tsx"),
    read("src/services/creator-service.ts"),
  ]);
  assert.doesNotMatch(service, /YOUTUBE|TIKTOK|INSTAGRAM.*KEY|client_secret/i);
  assert.match(route, /not connected/);
  assert.match(route, /temporarily unavailable\. Retry/);
  assert.match(service, /if \(!data\) return null/);
});
