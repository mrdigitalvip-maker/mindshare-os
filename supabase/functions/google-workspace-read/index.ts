import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, preflightResponse, rejectDisallowedOrigin } from "../_shared/http.ts";
import type { KivrynIntegrationCapability } from "../_shared/kivryn-integration-registry.ts";
import { safeProviderError } from "../_shared/creator-intelligence.ts";
import {
  resolveGoogleWorkspaceAccess,
  type GoogleWorkspaceProvider,
} from "../_shared/google-workspace-access.ts";

const READ_CAPABILITY: Record<GoogleWorkspaceProvider, KivrynIntegrationCapability> = {
  gmail: "mail.read",
  google_calendar: "calendar.read",
  google_drive: "files.read",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return preflightResponse(request);
  const rejected = rejectDisallowedOrigin(request);
  if (rejected) return rejected;
  if (request.method !== "POST") {
    return jsonResponse(request, { error: { code: "method_not_allowed" } }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return jsonResponse(request, { error: { code: "configuration_error" } }, 503);
  }

  const auth = createClient(url, anon, {
    global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return jsonResponse(request, { error: { code: "unauthorized" } }, 401);

  const input = await request.json().catch(() => ({}));
  const provider = String(input.provider ?? "") as GoogleWorkspaceProvider;
  if (!["gmail", "google_calendar", "google_drive"].includes(provider)) {
    return jsonResponse(request, { error: { code: "unsupported_provider" } }, 400);
  }
  const limit = Math.max(1, Math.min(20, Number(input.limit) || 5));
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { accessToken } = await resolveGoogleWorkspaceAccess({
      admin,
      userId: user.id,
      provider,
      capability: READ_CAPABILITY[provider],
    });
    const items =
      provider === "gmail"
        ? await readGmail(accessToken, limit)
        : provider === "google_calendar"
          ? await readCalendar(accessToken, limit)
          : await readDrive(accessToken, limit);
    return jsonResponse(request, { provider, items }, 200);
  } catch (cause) {
    const error = cause as Error & { code?: string; providerStatus?: number };
    const code =
      error.code ??
      (error.providerStatus ? safeProviderError(error.providerStatus) : "workspace_read_failed");
    const status =
      code === "connection_required" || code === "insufficient_scope"
        ? 409
        : code === "credential_expired"
          ? 401
          : code === "provider_not_configured"
            ? 503
            : 502;
    return jsonResponse(request, { error: { code } }, status);
  }
});

async function providerJson(url: string, access: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
  if (!response.ok) {
    throw Object.assign(new Error("provider_request_failed"), {
      providerStatus: response.status,
    });
  }
  return await response.json();
}

async function readGmail(access: string, limit: number) {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(limit));
  const list = (await providerJson(listUrl.toString(), access)) as {
    messages?: Array<{ id?: string; threadId?: string }>;
  };
  const ids = (list.messages ?? []).map((message) => message.id).filter(Boolean) as string[];
  return await Promise.all(
    ids.map(async (id) => {
      const messageUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`);
      messageUrl.searchParams.set("format", "metadata");
      for (const header of ["Subject", "From", "Date"]) {
        messageUrl.searchParams.append("metadataHeaders", header);
      }
      const message = (await providerJson(messageUrl.toString(), access)) as {
        id?: string;
        threadId?: string;
        snippet?: string;
        payload?: { headers?: Array<{ name?: string; value?: string }> };
      };
      const headers = new Map(
        (message.payload?.headers ?? []).map((header) => [
          String(header.name ?? "").toLowerCase(),
          String(header.value ?? ""),
        ]),
      );
      return {
        id: message.id ?? id,
        threadId: message.threadId ?? null,
        subject: headers.get("subject") ?? "",
        from: headers.get("from") ?? "",
        date: headers.get("date") ?? "",
        snippet: message.snippet ?? "",
      };
    }),
  );
}

async function readCalendar(access: string, limit: number) {
  const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  eventsUrl.searchParams.set("timeMin", new Date().toISOString());
  eventsUrl.searchParams.set("singleEvents", "true");
  eventsUrl.searchParams.set("orderBy", "startTime");
  eventsUrl.searchParams.set("maxResults", String(limit));
  const payload = (await providerJson(eventsUrl.toString(), access)) as {
    items?: Array<{
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      htmlLink?: string;
    }>;
  };
  return (payload.items ?? []).map((event) => ({
    id: event.id ?? "",
    summary: event.summary ?? "",
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    htmlLink: event.htmlLink ?? null,
  }));
}

async function readDrive(access: string, limit: number) {
  const filesUrl = new URL("https://www.googleapis.com/drive/v3/files");
  filesUrl.searchParams.set("pageSize", String(limit));
  filesUrl.searchParams.set("orderBy", "modifiedTime desc");
  filesUrl.searchParams.set(
    "fields",
    "files(id,name,mimeType,modifiedTime,webViewLink,trashed)",
  );
  filesUrl.searchParams.set("q", "trashed = false");
  const payload = (await providerJson(filesUrl.toString(), access)) as {
    files?: Array<{
      id?: string;
      name?: string;
      mimeType?: string;
      modifiedTime?: string;
      webViewLink?: string;
    }>;
  };
  return (payload.files ?? []).map((file) => ({
    id: file.id ?? "",
    name: file.name ?? "",
    mimeType: file.mimeType ?? "",
    modifiedTime: file.modifiedTime ?? null,
    webViewLink: file.webViewLink ?? null,
  }));
}
