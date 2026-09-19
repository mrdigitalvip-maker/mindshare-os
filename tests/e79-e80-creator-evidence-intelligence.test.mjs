import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lib = readFileSync(new URL("../src/lib/creator.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/routes/_shell.creator.tsx", import.meta.url), "utf8");

test("E79 selects provider-verified performance only with a sufficient sample", () => {
  assert.match(lib, /providerObservations\.length >= creatorMinimumSample/);
  assert.match(lib, /manualObservations\.length >= creatorMinimumSample/);
  assert.match(lib, /source: CreatorEvidenceSource/);
  assert.match(lib, /confidence: creatorEvidenceConfidence/);
  assert.match(lib, /strongestPostingWindow/);
});

test("E79 never collapses manual and verified evidence into one unlabeled pool", () => {
  assert.match(lib, /providerSampleCount: providerObservations\.length/);
  assert.match(lib, /manualSampleCount: manualObservations\.length/);
  assert.match(lib, /provider_verified/);
  assert.match(lib, /manual/);
  assert.doesNotMatch(lib, /\[\.\.\.providerObservations,\s*\.\.\.manualObservations\]/);
});

test("E79 derives posting slots deterministically instead of from device-local time", () => {
  assert.match(lib, /timeZone: input\.timezone\.trim\(\)/);
  assert.match(lib, /providerWeekday/);
  assert.match(lib, /providerHour/);
  assert.match(lib, /date\.getUTCHours\(\)/);
  assert.doesNotMatch(lib, /date\.getHours\(\)/);
});

test("E80 surfaces evidence provenance and confidence in Creator Web", () => {
  assert.match(route, /creatorEvidenceIntelligence/);
  assert.match(route, /Creator Intelligence baseada em evidência/);
  assert.match(route, /creatorIntelligence\.providerSampleCount/);
  assert.match(route, /creatorIntelligence\.manualSampleCount/);
  assert.match(route, /creatorIntelligence\.confidence/);
});

test("E80 constrains the Creator Copilot to historical evidence", () => {
  assert.match(route, /Treat creatorIntelligence as historical evidence, not a guarantee of future reach/);
  assert.match(route, /never invent benchmarks, audience-online activity, or a best posting time/);
  assert.match(route, /strongestPostingWindow is absent/);
});
