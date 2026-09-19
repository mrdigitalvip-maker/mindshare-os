import type { GoogleWorkspaceProvider } from "./google-workspace-access.ts";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function providerJson(url: string, accessToken: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw Object.assign(new Error("provider_request_failed"), {
        providerStatus: response.status,
      });
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function readGmail(accessToken: string, limit: number) {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(limit));
  const list = (await providerJson(listUrl.toString(), accessToken)) as {
    messages?: Array<{ id?: string; threadId?: string }>;
  };
  const ids = (list.messages ?? []).map((message) => message.id).filter(Boolean) as string[];
  return await Promise.all(
    ids.map(async (id) => {
      const messageUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
      );
      messageUrl.searchParams.set("format", "metadata");
      for (const header of ["Subject", "From", "Date"]) {
        messageUrl.searchParams.append("metadataHeaders", header);
      }
      const message = (await providerJson(messageUrl.toString(), accessToken)) as {
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
        id: cleanText(message.id ?? id, 128),
        threadId: cleanText(message.threadId ?? "", 128) || null,
        subject: cleanText(headers.get("subject") ?? "", 300),
        from: cleanText(headers.get("from") ?? "", 320),
        date: cleanText(headers.get("date") ?? "", 120),
        snippet: cleanText(message.snippet ?? "", 500),
      };
    }),
  );
}

async function readCalendar(accessToken: string, limit: number) {
  const eventsUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  eventsUrl.searchParams.set("timeMin", new Date().toISOString());
  eventsUrl.searchParams.set("singleEvents", "true");
  eventsUrl.searchParams.set("orderBy", "startTime");
  eventsUrl.searchParams.set("maxResults", String(limit));
  const payload = (await providerJson(eventsUrl.toString(), accessToken)) as {
    items?: Array<{
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      htmlLink?: string;
    }>;
  };
  return (payload.items ?? []).map((event) => ({
    id: cleanText(event.id ?? "", 128),
    summary: cleanText(event.summary ?? "", 300),
    start: cleanText(event.start?.dateTime ?? event.start?.date ?? "", 80) || null,
    end: cleanText(event.end?.dateTime ?? event.end?.date ?? "", 80) || null,
    htmlLink: cleanText(event.htmlLink ?? "", 500) || null,
  }));
}

async function readDrive(accessToken: string, limit: number) {
  const filesUrl = new URL("https://www.googleapis.com/drive/v3/files");
  filesUrl.searchParams.set("pageSize", String(limit));
  filesUrl.searchParams.set("orderBy", "modifiedTime desc");
  filesUrl.searchParams.set(
    "fields",
    "files(id,name,mimeType,modifiedTime,webViewLink,trashed)",
  );
  filesUrl.searchParams.set("q", "trashed = false");
  const payload = (await providerJson(filesUrl.toString(), accessToken)) as {
    files?: Array<{
      id?: string;
      name?: string;
      mimeType?: string;
      modifiedTime?: string;
      webViewLink?: string;
    }>;
  };
  return (payload.files ?? []).map((file) => ({
    id: cleanText(file.id ?? "", 128),
    name: cleanText(file.name ?? "", 300),
    mimeType: cleanText(file.mimeType ?? "", 120),
    modifiedTime: cleanText(file.modifiedTime ?? "", 80) || null,
    webViewLink: cleanText(file.webViewLink ?? "", 500) || null,
  }));
}

export async function readGoogleWorkspaceItems(input: {
  provider: GoogleWorkspaceProvider;
  accessToken: string;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(20, Math.trunc(input.limit ?? 5)));
  if (input.provider === "gmail") return await readGmail(input.accessToken, limit);
  if (input.provider === "google_calendar")
    return await readCalendar(input.accessToken, limit);
  return await readDrive(input.accessToken, limit);
}
