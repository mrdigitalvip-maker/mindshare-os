export const nexoraStates = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "attention",
  "success",
  "quiet",
] as const;
export type NexoraState = (typeof nexoraStates)[number];
export function normalizeNexoraState(value: unknown): NexoraState {
  return typeof value === "string" && (nexoraStates as readonly string[]).includes(value)
    ? (value as NexoraState)
    : "idle";
}
export function normalizeAmplitude(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
