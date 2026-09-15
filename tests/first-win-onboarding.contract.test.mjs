import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("web onboarding routes the saved primary goal into a useful first workspace", async () => {
  const source = await read("src/routes/onboarding.tsx");

  for (const [goal, route] of [
    ["Boost my productivity", "/productivity"],
    ["Manage projects", "/projects"],
    ["Learn & study", "/studies"],
    ["Track my finances", "/finance"],
    ["Create content", "/creator"],
    ["Translate & communicate", "/translate"],
    ["Build AI agents", "/agents"],
    ["Just exploring", "/assistant"],
  ]) {
    assert.ok(source.includes(`\"${goal}\": \"${route}\"`), `${goal} -> ${route}`);
  }

  assert.match(source, /completionInFlight\.current = true/);
  assert.match(source, /navigate\(\{ to: firstDestination\(goal\), replace: true \}\)/);
  assert.doesNotMatch(source, /toast\.success\("Welcome to KIVRYN"\);\s*navigate\(\{ to: "\/dashboard"/);
});

test("mobile onboarding asks for a first win before marking onboarding complete", async () => {
  const source = await read("mobile/app/onboarding/index.tsx");

  assert.match(source, /SUA PRIMEIRA VITÓRIA/);
  assert.match(source, /YOUR FIRST WIN/);
  assert.match(source, /O que você quer fazer primeiro\?/);
  assert.match(source, /What do you want to do first\?/);
  assert.match(source, /primary_goal: choice\.goal/);
  assert.match(source, /router\.replace\(choice\.destination\)/);
  assert.match(source, /const completionInFlight = useRef\(false\)/);
  assert.match(source, /profile\.data\?\.onboarded && !busy && !completionInFlight\.current/);
  assert.match(source, /completionInFlight\.current = true/);
  assert.match(source, /catch \{\s*completionInFlight\.current = false/);

  for (const route of ["/assistant", "/projects", "/studies", "/productivity"])
    assert.ok(source.includes(`destination: \"${route}\"`), route);
});
