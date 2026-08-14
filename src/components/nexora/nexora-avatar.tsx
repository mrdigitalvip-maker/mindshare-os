import { useId } from "react";
import { cn } from "@/lib/utils";

export type NexoraAvatarState =
  "idle" | "listening" | "thinking" | "speaking" | "attention" | "success" | "quiet";

export function NexoraAvatar({
  state = "idle",
  compact = false,
  amplitude = 0,
  className,
}: {
  state?: NexoraAvatarState;
  compact?: boolean;
  amplitude?: number;
  className?: string;
}) {
  const instanceId = useId().replace(/:/g, "");
  const metalId = `nexora-metal-${instanceId}`;
  const copperId = `nexora-copper-${instanceId}`;
  const mouthHeight = state === "speaking" ? Math.max(3, 4 + amplitude * 10) : 2;
  return (
    <div
      className={cn("nexora-avatar", `is-${state}`, compact && "is-compact", className)}
      role="img"
      aria-label={`NEXORA está ${state}`}
    >
      <div className="nexora-avatar__halo" />
      <svg viewBox="0 0 260 300" aria-hidden="true">
        <defs>
          <linearGradient id={metalId} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#e7e3de" />
            <stop offset=".5" stopColor="#666a72" />
            <stop offset="1" stopColor="#17191e" />
          </linearGradient>
          <linearGradient id={copperId} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#8e5f36" />
            <stop offset=".5" stopColor="#d5a66d" />
            <stop offset="1" stopColor="#704426" />
          </linearGradient>
        </defs>
        <g className="nexora-avatar__body">
          <path
            d="M35 300c4-68 35-92 95-92s91 24 95 92"
            fill={`url(#${metalId})`}
            stroke="#d5a66d"
            strokeOpacity=".25"
          />
          <path d="M96 205v39c18 13 50 13 68 0v-39" fill="#34373e" />
          <path
            d="M61 82c0-48 30-72 69-72s69 24 69 72v81c0 42-30 67-69 67s-69-25-69-67z"
            fill={`url(#${metalId})`}
            stroke="#d5a66d"
            strokeOpacity=".5"
            strokeWidth="2"
          />
          <path d="M73 94c10-38 104-38 114 0v65c-17 36-97 36-114 0z" fill="#101318" />
          <g className="nexora-avatar__eyes" fill="#bfefff">
            <rect x="91" y="119" width="25" height="5" rx="3" />
            <rect x="144" y="119" width="25" height="5" rx="3" />
          </g>
          <rect
            className="nexora-avatar__mouth"
            x="112"
            y={176 - mouthHeight / 2}
            width="36"
            height={mouthHeight}
            rx="4"
            fill="#d5a66d"
          />
          <path d="M61 112l-10 8v36l10 8M199 112l10 8v36l-10 8" fill={`url(#${copperId})`} />
          <circle className="nexora-avatar__core" cx="130" cy="267" r="12" fill="#d5a66d" />
          <circle cx="130" cy="267" r="5" fill="#fff" />
        </g>
      </svg>
      <span className="sr-only">Estado visual: {state}</span>
    </div>
  );
}
