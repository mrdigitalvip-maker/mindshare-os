import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source=(path:string)=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");

const e65=source("../../supabase/migrations/202609180040_e65_creator_transcript_progress.sql");
const e66=source("../../supabase/migrations/202609180041_e66_creator_clip_candidates.sql");
const worker=source("../../services/creator-worker/src/main.ts");
const service=source("../services/creator-service.ts");
const screen=source("../app/(app)/creator/[projectId].tsx");

describe("E65/E66 Creator transcript and candidate parity",()=>{
  test("Android reads the shared transcript and candidate tables",()=>{
    expect(service).toContain('"creator_transcripts"');
    expect(service).toContain('"creator_clip_candidates"');
    expect(service).toContain("getCreatorTranscript");
    expect(service).toContain("listCreatorClipCandidates");
  });

  test("Android progress is backend-authoritative rather than stage-derived",()=>{
    expect(service).toContain("progress_percent");
    expect(screen).toContain("job?.progressPercent");
    expect(screen).not.toContain("stageOrder");
    expect(screen).not.toContain("stageIndex");
  });

  test("Android distinguishes candidates from rendered clips",()=>{
    expect(screen).toContain('candidates: "CANDIDATOS"');
    expect(screen).toContain("Candidates são análise/timestamps");
    expect(screen).toContain('clips: "CORTES RENDERIZADOS"');
    expect(screen).toContain("getCreatorTranscript");
    expect(screen).toContain("listCreatorClipCandidates");
  });

  test("shared tables remain owner-readable and worker-written",()=>{
    expect(e65).toContain("grant select on table public.creator_transcripts to authenticated");
    expect(e65).toContain("grant all privileges on table public.creator_transcripts to service_role");
    expect(e66).toContain("grant select on table public.creator_clip_candidates to authenticated");
    expect(e66).toContain("grant all privileges on table public.creator_clip_candidates to service_role");
  });

  test("worker stores transcript and candidates before rendering",()=>{
    expect(worker).toContain('.from("creator_transcripts")');
    expect(worker).toContain('.from("creator_clip_candidates")');
    expect(worker).toContain('progress(job.id, "generating_candidates")');
    expect(worker).toContain("candidate_id: candidateRow.id");
  });
});
