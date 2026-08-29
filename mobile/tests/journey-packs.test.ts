import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { packErrorMessage } from "../lib/journey-packs";
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const sql = read("../../supabase/migrations/202608290003_journey_packs_v1.sql");
const detail = read("../app/(app)/packs/[slug].tsx"),
  catalog = read("../app/(app)/packs/index.tsx");
describe("Journey Packs backend contract", () => {
  test("templates are versioned, client immutable, and contain no progress", () => {
    expect(sql).toContain("unique(slug, version)");
    expect(sql).toContain("source_pack_version integer");
    expect(sql).toContain("revoke insert, update, delete on public.journey_packs");
    expect(sql).toContain("create trigger journeys_protect_pack_source");
    expect(sql.match(/create table public.journey_packs[\s\S]*?\);/)?.[0]).not.toContain(
      "completed_at",
    );
  });
  test("published reads and retirement are server-owned", () => {
    expect(sql).toContain("where p.status='published'");
    expect(sql).toContain("if pack.status='retired'");
    expect(sql).toContain("security definer set search_path=pg_catalog,public");
  });
  test("start is authenticated, locked and retry-safe", () => {
    expect(sql).toContain("uid uuid:=auth.uid()");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("primary key(user_id, request_key)");
    expect(sql).toContain("if existing is not null then return existing");
  });
  test("canonical Journey, mission and verified Momentum remain in use", () => {
    expect(sql).toContain("insert into public.journeys");
    expect(sql).toContain("create or replace function public.ensure_daily_journey_mission");
    expect(sql).toContain("perform public.apply_verified_mission_effects(result)");
    expect(sql).not.toContain("insert into public.momentum_events");
  });
  test("progress is user state completed by verified action", () => {
    expect(sql).toContain("journey_pack_step_instances");
    expect(sql).toContain("completed_at=coalesce(completed_at,statement_timestamp())");
    expect(sql).not.toContain("duration_days <=");
  });
});
describe("Journey Packs mobile contract", () => {
  test("catalog is truthful and has no fake social proof", () => {
    expect(catalog).toContain("Nenhum programa disponível agora");
    for (const fake of ["rating", "review", "membros", "popularidade", "success rate"])
      expect(catalog.toLowerCase()).not.toContain(fake);
  });
  test("detail previews, explicitly applies, and blocks duplicate taps", () => {
    expect(detail).toContain("PREVIEW → CONFIRMAR");
    expect(detail).toContain("start.isPending");
    expect(detail).toContain("requestKey: key.current");
    expect(detail).toContain("router.replace(`/journeys/${id}`)");
  });
  test("stable errors are safe", () => {
    expect(packErrorMessage("pack_retired")).toContain("não está mais disponível");
    expect(packErrorMessage("FREE_CREATION_LIMIT_REACHED")).toContain("plano Free");
  });
});
