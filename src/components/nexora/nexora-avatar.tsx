import { useEffect, useId, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type NexoraAvatarState =
  "idle" | "listening" | "thinking" | "speaking" | "attention" | "success" | "quiet";

export type LegacyNexoraIdentity = "nexora" | "nova" | "atlas" | "lyra" | "orion";

/** Read-time compatibility for preferences saved before NEXORA became one permanent identity. */
export function normalizeNexoraIdentity(_value: unknown): "nexora" {
  return "nexora";
}

export function NexoraAvatar({
  state = "idle",
  compact = false,
  amplitude = 0,
  className,
}: {
  state?: NexoraAvatarState;
  amplitude?: number;
  compact?: boolean;
  className?: string;
}) {
  const rawId = useId();
  const id = `nexora-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [blinking, setBlinking] = useState(false);
  const level = Number.isFinite(amplitude) ? Math.min(1, Math.max(0, amplitude)) : 0;
  const safeState: NexoraAvatarState = [
    "idle",
    "listening",
    "thinking",
    "speaking",
    "attention",
    "success",
    "quiet",
  ].includes(state)
    ? state
    : "idle";

  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let blinkTimer = 0;
    let openTimer = 0;
    const schedule = () => {
      blinkTimer = window.setTimeout(
        () => {
          setBlinking(true);
          openTimer = window.setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 120);
        },
        3200 + Math.random() * 4800,
      );
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, []);

  return (
    <figure
      className={cn(
        "nexora-avatar",
        `is-${safeState}`,
        compact && "is-compact",
        blinking && "is-blinking",
        className,
      )}
      style={{ "--nexora-amplitude": level } as CSSProperties}
      aria-hidden="true"
    >
      <div className="nexora-avatar__environment" />
      <div className="nexora-avatar__aura" />
      <svg className="nexora-avatar__vector" viewBox="0 0 320 400" focusable="false">
        <defs>
          <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#343a40" />
            <stop offset=".48" stopColor="#11151a" />
            <stop offset="1" stopColor="#05070a" />
          </linearGradient>
          <linearGradient id={`${id}-face`} x1=".2" y1="0" x2=".8" y2="1">
            <stop stopColor="#252b31" />
            <stop offset="1" stopColor="#0b0e12" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#8f6337" />
            <stop offset=".5" stopColor="#e1b779" />
            <stop offset="1" stopColor="#81542f" />
          </linearGradient>
        </defs>
        <g className="nexora-avatar__body">
          <path
            className="nexora-avatar__shoulders"
            d="M24 400v-48c5-38 46-57 91-66h90c45 9 86 28 91 66v48z"
            fill={`url(#${id}-shell)`}
          />
          <path d="M116 270h88l15 67-59 28-59-28z" fill="#090c10" stroke="#745337" />
          <path d="M132 261h56l13 57-41 20-41-20z" fill="#171c21" />
          <path className="nexora-avatar__core" d="M142 317h36l-18 11z" fill={`url(#${id}-gold)`} />
          <path
            d="M18 381c35-29 70-38 104-43M302 381c-35-29-70-38-104-43"
            fill="none"
            stroke="#a77a49"
            strokeOpacity=".55"
          />
          <g className="nexora-avatar__head">
            <path
              d="M91 79c12-43 41-63 69-63s57 20 69 63l-7 151-28 45-34 14-34-14-28-45z"
              fill={`url(#${id}-shell)`}
              stroke="#4c5257"
            />
            <path
              d="M112 87c12-29 30-42 48-42s36 13 48 42l-5 128-20 37-23 10-23-10-20-37z"
              fill={`url(#${id}-face)`}
              stroke="#775737"
              strokeOpacity=".75"
            />
            <path
              d="M91 107 72 125l9 82 20 14M229 107l19 18-9 82-20 14"
              fill="#14191e"
              stroke="#9d7448"
            />
            <circle
              className="nexora-avatar__temple"
              cx="84"
              cy="165"
              r="9"
              fill="none"
              stroke="#c3945d"
            />
            <circle
              className="nexora-avatar__temple"
              cx="236"
              cy="165"
              r="9"
              fill="none"
              stroke="#c3945d"
            />
            <g className="nexora-avatar__eyes">
              <path
                d="M120 139q18-10 33 1-16 9-34 3zM200 139q-18-10-33 1 16 9 34 3z"
                fill="#d8f5ef"
              />
            </g>
            <path d="M154 151h12l5 43-11 9-11-9z" fill="#0a0d10" stroke="#323940" />
            <g className="nexora-avatar__speech">
              <rect x="137" y="221" width="9" height="2" rx="1" />
              <rect x="150" y="220" width="20" height="3" rx="1.5" />
              <rect x="174" y="221" width="9" height="2" rx="1" />
            </g>
            <path
              d="M113 102q47-32 94 0M126 252l34 22 34-22"
              fill="none"
              stroke={`url(#${id}-gold)`}
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>
      <span className="nexora-avatar__status" />
    </figure>
  );
}
