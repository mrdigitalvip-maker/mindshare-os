import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const e65=read("supabase/migrations/202609180040_e65_creator_transcript_progress.sql");
const e66=read("supabase/migrations/202609180041_e66_creator_clip_candidates.sql");
const worker=read("services/creator-worker/src/main.ts");
const domain=read("services/creator-worker/src/domain.ts");
const service=read("src/services/creator-service.ts");
const route=read("src/routes/_shell.creator.tsx");

test("E65 persists timestamped transcripts as server-written owner-readable evidence",()=>{
  assert.match(e65,/create table if not exists public\.creator_transcripts/);
  assert.match(e65,/job_id uuid not null unique references public\.creator_jobs/);
  assert.match(e65,/segments jsonb not null/);
  assert.match(e65,/segment_count integer not null/);
  assert.match(e65,/revoke all privileges on table public\.creator_transcripts from anon, authenticated/);
  assert.match(e65,/grant select on table public\.creator_transcripts to authenticated/);
  assert.match(e65,/grant all privileges on table public\.creator_transcripts to service_role/);
  assert.match(e65,/create policy creator_transcripts_owner_select/);
  assert.match(e65,/user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(e65,/for (insert|update|delete)[\s\S]*creator_transcripts_owner/i);
});

test("E65 backend milestones are authoritative and preserve the existing job lease state machine",()=>{
  for(const stage of [
    "ingesting","transcribing","analyzing","detecting_segments",
    "generating_candidates","rendering","ready",
  ]) assert.match(e65,new RegExp("when '"+stage+"'"));
  assert.match(e65,/progress_stage = 'ingesting'/);
  assert.match(e65,/progress_stage = 'ready'/);
  assert.match(e65,/progress_percent = 100/);
  assert.match(e65,/status = 'completed'/);
  assert.match(worker,/creator_worker_progress/);
  assert.match(worker,/progress\(job\.id, "detecting_segments"\)/);
  assert.match(worker,/progress\(job\.id, "generating_candidates"\)/);
});

test("E65 worker persists the full timestamped transcript before candidate generation",()=>{
  const transcriptIndex=worker.indexOf('.from("creator_transcripts")');
  const candidateProgressIndex=worker.indexOf('progress(job.id, "generating_candidates")');
  assert.ok(transcriptIndex >= 0);
  assert.ok(candidateProgressIndex > transcriptIndex);
  assert.match(worker,/segments: transcript\.segments/);
  assert.match(worker,/segment_count: transcript\.segments\.length/);
});

test("E66 stores real candidates separately from rendered clips",()=>{
  assert.match(e66,/create table if not exists public\.creator_clip_candidates/);
  assert.match(e66,/candidate_status in \('candidate','rendering','rendered','failed'\)/);
  assert.match(e66,/unique \(job_id,start_ms,end_ms,aspect_ratio\)/);
  assert.match(e66,/add column if not exists candidate_id uuid/);
  assert.match(e66,/references public\.creator_clip_candidates\(id\)/);
  assert.match(e66,/revoke all privileges on table public\.creator_clip_candidates from anon, authenticated/);
  assert.match(e66,/grant select on table public\.creator_clip_candidates to authenticated/);
  assert.match(e66,/grant all privileges on table public\.creator_clip_candidates to service_role/);
});

test("E66 persists candidates before render and links rendered outputs back to candidates",()=>{
  const candidateWrite=worker.indexOf('.from("creator_clip_candidates")');
  const renderStage=worker.indexOf('stage(job.id, "rendering")');
  assert.ok(candidateWrite >= 0);
  assert.ok(renderStage > candidateWrite);
  assert.match(worker,/candidate_status: "rendering"/);
  assert.match(worker,/candidate_status: "rendered"/);
  assert.match(worker,/candidate_id: candidateRow\.id/);
  assert.match(worker,/if \(candidateRow\.candidate_status === "rendered"\) continue/);
});

test("E66 prioritizes quality rather than manufacturing a fixed number of clips",()=>{
  assert.match(domain,/export function selectQualityCandidates/);
  assert.match(domain,/minScore \?\? 55/);
  assert.match(domain,/limit \?\? 5/);
  assert.match(worker,/selectQualityCandidates\(scored, \{ limit: 5, minScore: 55 \}\)/);
  assert.doesNotMatch(worker,/diversify\(scored, 3\)/);
});

test("Web explicitly distinguishes candidates from actual rendered video files",()=>{
  assert.match(service,/"creator_transcripts"/);
  assert.match(service,/"creator_clip_candidates"/);
  assert.match(route,/Clip candidates/);
  assert.match(route,/Candidates are persisted timestamps\/analysis before render/);
  assert.match(route,/Real clip library/);
  assert.match(route,/Rendered clips will appear here only after the canonical worker creates real outputs/);
  assert.match(route,/Backend-confirmed progress/);
});
