import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`, import.meta.url),"utf8");
const studio=read("supabase/migrations/202609180031_e53_studio_rls_indexes.sql");
const passport=read("supabase/migrations/202609180032_e54_passport_companion_rls_indexes.sql");

test("E53 hardens Studio owner policies without changing authenticated CRUD surface",()=>{
  for(const table of [
    "studio_achievements","studio_activity","studio_daily_goals",
    "studio_enrollments","studio_progress","studio_streaks",
  ]){
    assert.match(studio,new RegExp(`on public\\.${table}`));
  }
  assert.equal((studio.match(/for select\s+to authenticated/g)??[]).length,6);
  assert.equal((studio.match(/for insert\s+to authenticated/g)??[]).length,6);
  assert.equal((studio.match(/for update\s+to authenticated/g)??[]).length,6);
  assert.equal((studio.match(/for delete\s+to authenticated/g)??[]).length,6);
  const executableStudio = studio.replace(/^--.*$/gm, "").replaceAll("(select auth.uid())","");
  assert.doesNotMatch(executableStudio,/auth\.uid\(\)/);
});

test("E53 adds only the missing Studio leading FK indexes",()=>{
  for(const name of [
    "studio_activity_lesson_id_idx",
    "studio_activity_track_id_idx",
    "studio_enrollments_track_id_idx",
    "studio_progress_lesson_id_idx",
  ]) assert.match(studio,new RegExp(`create index if not exists ${name}`));
  assert.doesNotMatch(studio,/drop index/i);
});

test("E54 preserves exact Passport companion operation surface and authenticated role",()=>{
  for(const name of [
    "passport missions owner select","passport missions owner insert",
    "passport missions owner update","passport missions owner delete",
    "passport placement owner select","passport placement owner insert",
    "passport roleplay owner select","passport roleplay owner insert",
    "passport roleplay owner update","passport roleplay owner delete",
    "passport vocabulary owner select","passport vocabulary owner insert",
    "passport vocabulary owner update","passport vocabulary owner delete",
    "passport vocabulary reviews owner select",
  ]) assert.match(passport,new RegExp(`create policy "${name}"`));
  const executablePassport = passport.replace(/^--.*$/gm, "").replaceAll("(select auth.uid())","");
  assert.doesNotMatch(executablePassport,/auth\.uid\(\)/);
  assert.doesNotMatch(passport,/to public/);
});

test("E54 adds only missing Passport companion leading FK indexes",()=>{
  for(const name of [
    "passport_daily_missions_track_id_idx",
    "passport_placement_attempts_track_id_idx",
    "passport_roleplay_sessions_track_id_idx",
    "passport_vocabulary_source_lesson_id_idx",
    "passport_vocabulary_track_id_idx",
  ]) assert.match(passport,new RegExp(`create index if not exists ${name}`));
  assert.doesNotMatch(passport,/drop index/i);
});
