import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const service = source("../services/creator-youtube-service.ts");
const screen = source("../app/(app)/creator/new.tsx");
const edge = source("../../supabase/functions/creator-youtube-metadata/index.ts");

describe("Creator YouTube diagnostics parity", () => {
  test("Android preserves structured Edge errors", () => {
    expect(service).toContain("CreatorYouTubeMetadataError");
    expect(service).toContain("context as Response");
    expect(service).toContain("configuration_error");
    expect(service).toContain("youtube_provider_configuration");
    expect(service).toContain("youtube_provider_quota");
  });

  test("Android presents safe bilingual diagnostics", () => {
    expect(screen).toContain("metadataErrorMessage");
    expect(screen).toContain("A integração de metadados do YouTube não está configurada no servidor.");
    expect(screen).toContain("YouTube metadata integration is not configured on the server.");
    expect(screen).toContain("A configuração da YouTube Data API precisa ser revisada.");
  });

  test("shared Edge remains metadata-only and never adds platform download", () => {
    expect(edge).toContain("downloadAvailable: false");
    expect(edge).toContain("originalUploadRequired: true");
    expect(edge.toLowerCase()).not.toContain("yt-dlp");
    expect(edge.toLowerCase()).not.toContain("youtube-dl");
  });
});
