import { createDiagnosticId } from "@/lib/diagnostics";

export type NetworkFailureKind =
  | "offline"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server"
  | "invalid_response"
  | "unknown";
export class NetworkError extends Error {
  constructor(
    public readonly kind: NetworkFailureKind,
    message: string,
    public readonly diagnosticId = createDiagnosticId("net"),
    public readonly status?: number,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}
export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 35_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      const kinds: Partial<Record<number, NetworkFailureKind>> = {
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        429: "rate_limited",
      };
      throw new NetworkError(
        kinds[response.status] ?? (response.status >= 500 ? "server" : "unknown"),
        `Request failed (${response.status}).`,
        undefined,
        response.status,
      );
    }
    try {
      const data = (await response.json()) as T | null;
      if (data === null) throw new NetworkError("invalid_response", "The server returned no data.");
      return data;
    } catch {
      throw new NetworkError("invalid_response", "The server returned an invalid response.");
    }
  } catch (error) {
    if (error instanceof NetworkError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new NetworkError("timeout", "The request timed out.");
    if (error instanceof TypeError)
      throw new NetworkError("offline", "NEXORA could not reach the network.");
    throw new NetworkError("unknown", "An unexpected network error occurred.");
  } finally {
    clearTimeout(timer);
  }
}
