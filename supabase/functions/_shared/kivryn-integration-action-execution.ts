import type { KivrynIntegrationCapability } from "./kivryn-integration-registry.ts";
import {
  GoogleWorkspaceAccessError,
  resolveGoogleWorkspaceAccess,
  type GoogleWorkspaceProvider,
} from "./google-workspace-access.ts";

type AdminClient = {
  from: (table: string) => any;
};

type ExternalActionName =
  | "send_email"
  | "create_calendar_event"
  | "create_drive_text_file";

export class KivrynIntegrationActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "KivrynIntegrationActionError";
  }
}

const ACTION_PROVIDER: Record<
  ExternalActionName,
  { provider: GoogleWorkspaceProvider; capability: KivrynIntegrationCapability }
> = {
  send_email: { provider: "gmail", capability: "mail.send" },
  create_calendar_event: { provider: "google_calendar", capability: "calendar.write" },
  create_drive_text_file: { provider: "google_drive", capability: "files.write" },
};

const emailPattern = /^[^\s@<>(),;:]+@[^\s@<>(),;:]+\.[^\s@<>(),;:]+$/;

function splitEmails(value: unknown, max = 20) {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "string" || value.length > 2000) {
    throw new KivrynIntegrationActionError("invalid_payload");
  }
  const values = value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!values.length || values.length > max || values.some((item) => !emailPattern.test(item))) {
    throw new KivrynIntegrationActionError("invalid_payload");
  }
  return values;
}

function cleanHeader(value: unknown, max: number) {
  if (typeof value !== "string") throw new KivrynIntegrationActionError("invalid_payload");
  const clean = value.trim();
  if (!clean || clean.length > max || /[\r\n]/.test(clean)) {
    throw new KivrynIntegrationActionError("invalid_payload");
  }
  return clean;
}

function cleanText(value: unknown, max: number, required = true) {
  if (value === null || value === undefined) {
    if (required) throw new KivrynIntegrationActionError("invalid_payload");
    return "";
  }
  if (typeof value !== "string") throw new KivrynIntegrationActionError("invalid_payload");
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) {
    throw new KivrynIntegrationActionError("invalid_payload");
  }
  return clean;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64UrlUtf8(value: string) {
  return toBase64(new TextEncoder().encode(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function encodedHeader(value: string) {
  return `=?UTF-8?B?${toBase64(new TextEncoder().encode(value))}?=`;
}

function actionType(value: unknown): ExternalActionName {
  if (
    value === "send_email" ||
    value === "create_calendar_event" ||
    value === "create_drive_text_file"
  ) {
    return value;
  }
  throw new KivrynIntegrationActionError("unsupported_integration_action");
}

async function existingClaim(admin: AdminClient, userId: string, requestId: string) {
  const { data, error } = await admin
    .from("nexora_action_runs")
    .select("id,action_type,status,provider,external_resource_ref")
    .eq("user_id", userId)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw new KivrynIntegrationActionError("persistence_error");
  return data;
}

function existingResult(
  existing: any,
  actionId: string,
  kind: ExternalActionName,
  provider: GoogleWorkspaceProvider,
) {
  if (!existing) return null;
  if (
    String(existing.id) !== actionId ||
    String(existing.action_type) !== kind ||
    (existing.provider && String(existing.provider) !== provider)
  ) {
    throw new KivrynIntegrationActionError("idempotency_conflict");
  }
  if (existing.status === "applied" && typeof existing.external_resource_ref === "string") {
    return {
      status: "applied" as const,
      provider,
      externalResourceRef: existing.external_resource_ref,
      idempotent: true,
    };
  }
  if (existing.status === "applying" || existing.status === "uncertain") {
    throw new KivrynIntegrationActionError("integration_action_uncertain");
  }
  throw new KivrynIntegrationActionError("integration_action_failed");
}

async function claim(
  admin: AdminClient,
  input: {
    userId: string;
    actionId: string;
    requestId: string;
    kind: ExternalActionName;
    provider: GoogleWorkspaceProvider;
  },
) {
  const existing = await existingClaim(admin, input.userId, input.requestId);
  const reused = existingResult(existing, input.actionId, input.kind, input.provider);
  if (reused) return reused;

  const { error } = await admin.from("nexora_action_runs").insert({
    id: input.actionId,
    user_id: input.userId,
    request_id: input.requestId,
    conversation_id: null,
    action_type: input.kind,
    status: "applying",
    provider: input.provider,
  });
  if (!error) return null;

  const raced = await existingClaim(admin, input.userId, input.requestId);
  const racedResult = existingResult(raced, input.actionId, input.kind, input.provider);
  if (racedResult) return racedResult;
  throw new KivrynIntegrationActionError("persistence_error");
}

async function markRun(
  admin: AdminClient,
  input: {
    userId: string;
    actionId: string;
    status: "applied" | "failed" | "uncertain";
    externalResourceRef?: string;
    errorCode?: string;
  },
) {
  const values: Record<string, unknown> = {
    status: input.status,
    applied_at: input.status === "applied" ? new Date().toISOString() : null,
    error_code: input.errorCode ?? null,
  };
  if (input.externalResourceRef) values.external_resource_ref = input.externalResourceRef.slice(0, 500);
  const { error } = await admin
    .from("nexora_action_runs")
    .update(values)
    .eq("id", input.actionId)
    .eq("user_id", input.userId)
    .eq("status", "applying");
  return !error;
}

async function providerFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendEmail(accessToken: string, action: Record<string, unknown>) {
  const to = splitEmails(action.to);
  if (!to.length) throw new KivrynIntegrationActionError("invalid_payload");
  const cc = splitEmails(action.cc);
  const bcc = splitEmails(action.bcc);
  const subject = cleanHeader(action.subject, 998);
  const body = cleanText(action.body, 12000);
  const headers = [
    `To: ${to.join(", ")}`,
    ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
    ...(bcc.length ? [`Bcc: ${bcc.join(", ")}`] : []),
    `Subject: ${encodedHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  const raw = base64UrlUtf8(`${headers.join("\r\n")}\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}`);
  const response = await providerFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  return response;
}

function isoDateTime(value: unknown) {
  const clean = cleanText(value, 80);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(clean) || Number.isNaN(Date.parse(clean))) {
    throw new KivrynIntegrationActionError("invalid_payload");
  }
  return clean;
}

async function createCalendarEvent(accessToken: string, action: Record<string, unknown>) {
  const summary = cleanHeader(action.summary, 500);
  const start = isoDateTime(action.start);
  const end = isoDateTime(action.end);
  if (Date.parse(end) <= Date.parse(start)) throw new KivrynIntegrationActionError("invalid_payload");
  const attendees = action.attendees ? splitEmails(action.attendees, 50) : [];
  const payload = {
    summary,
    start: { dateTime: start },
    end: { dateTime: end },
    ...(action.description ? { description: cleanText(action.description, 4000, false) } : {}),
    ...(action.location ? { location: cleanHeader(action.location, 500) } : {}),
    ...(attendees.length ? { attendees: attendees.map((email) => ({ email })) } : {}),
  };
  return await providerFetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function createDriveTextFile(accessToken: string, action: Record<string, unknown>) {
  const name = cleanHeader(action.name, 255);
  const content = cleanText(action.content, 12000);
  const boundary = `kivryn_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = JSON.stringify({ name, mimeType: "text/plain" });
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${content}\r\n`,
    `--${boundary}--`,
  ].join("");
  return await providerFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
}

async function providerRequest(
  accessToken: string,
  kind: ExternalActionName,
  action: Record<string, unknown>,
) {
  if (kind === "send_email") return await sendEmail(accessToken, action);
  if (kind === "create_calendar_event") return await createCalendarEvent(accessToken, action);
  return await createDriveTextFile(accessToken, action);
}

export async function executeKivrynIntegrationAction(input: {
  admin: AdminClient;
  userId: string;
  actionId: string;
  requestId: string;
  action: Record<string, unknown>;
}) {
  const kind = actionType(input.action.action_type);
  const authority = ACTION_PROVIDER[kind];

  let accessToken: string;
  try {
    const access = await resolveGoogleWorkspaceAccess({
      admin: input.admin,
      userId: input.userId,
      provider: authority.provider,
      capability: authority.capability,
    });
    accessToken = access.accessToken;
  } catch (error) {
    if (error instanceof GoogleWorkspaceAccessError) {
      throw new KivrynIntegrationActionError(error.code);
    }
    throw new KivrynIntegrationActionError("integration_access_failed");
  }

  const existing = await claim(input.admin, {
    userId: input.userId,
    actionId: input.actionId,
    requestId: input.requestId,
    kind,
    provider: authority.provider,
  });
  if (existing) return existing;

  let response: Response;
  try {
    response = await providerRequest(accessToken, kind, input.action);
  } catch (error) {
    if (error instanceof KivrynIntegrationActionError) {
      await markRun(input.admin, {
        userId: input.userId,
        actionId: input.actionId,
        status: "failed",
        errorCode: error.code,
      });
      throw error;
    }
    await markRun(input.admin, {
      userId: input.userId,
      actionId: input.actionId,
      status: "uncertain",
      errorCode: "provider_result_uncertain",
    });
    throw new KivrynIntegrationActionError("integration_action_uncertain");
  }

  if (!response.ok) {
    const uncertain = response.status === 429 || response.status >= 500;
    await markRun(input.admin, {
      userId: input.userId,
      actionId: input.actionId,
      status: uncertain ? "uncertain" : "failed",
      errorCode: uncertain ? "provider_result_uncertain" : "provider_request_failed",
    });
    throw new KivrynIntegrationActionError(
      uncertain ? "integration_action_uncertain" : "provider_request_failed",
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    await markRun(input.admin, {
      userId: input.userId,
      actionId: input.actionId,
      status: "uncertain",
      errorCode: "provider_result_uncertain",
    });
    throw new KivrynIntegrationActionError("integration_action_uncertain");
  }

  const externalResourceRef =
    typeof payload.id === "string"
      ? payload.id
      : typeof payload.messageId === "string"
        ? payload.messageId
        : "";
  if (!externalResourceRef) {
    await markRun(input.admin, {
      userId: input.userId,
      actionId: input.actionId,
      status: "uncertain",
      errorCode: "provider_result_uncertain",
    });
    throw new KivrynIntegrationActionError("integration_action_uncertain");
  }

  const persisted = await markRun(input.admin, {
    userId: input.userId,
    actionId: input.actionId,
    status: "applied",
    externalResourceRef,
  });
  if (!persisted) {
    throw new KivrynIntegrationActionError("integration_action_uncertain");
  }

  await input.admin
    .from("creator_platform_connections")
    .update({
      last_success_at: new Date().toISOString(),
      safe_error_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("platform", authority.provider)
    .eq("status", "connected");

  return {
    status: "applied" as const,
    provider: authority.provider,
    externalResourceRef,
    idempotent: false,
  };
}
