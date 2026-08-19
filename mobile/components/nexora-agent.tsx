import { memo } from "react";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { normalizeAmplitude, normalizeNexoraState, type NexoraState } from "@/lib/nexora-state";

const stateColors: Record<NexoraState, string> = {
  idle: "#D6A763",
  listening: "#E3B978",
  thinking: "#C18A4F",
  speaking: "#E7C88F",
  attention: "#F4C66A",
  success: "#55D6A8",
  quiet: "#6E7890",
};
export const NexoraAgent = memo(function NexoraAgent({
  state,
  amplitude,
  size = 148,
}: {
  state?: NexoraState | string;
  amplitude?: number;
  size?: number;
}) {
  const safeState = normalizeNexoraState(state);
  const safeAmplitude = normalizeAmplitude(amplitude);
  const accent = stateColors[safeState];
  const ring = 50 + safeAmplitude * 5;
  return (
    <Svg
      accessibilityLabel={`NEXORA is ${safeState}`}
      accessibilityRole="image"
      width={size}
      height={size}
      viewBox="0 0 120 120"
    >
      <Defs>
        <LinearGradient id="core" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6F7FB" />
          <Stop offset="1" stopColor={accent} />
        </LinearGradient>
      </Defs>
      <Circle
        cx="60"
        cy="60"
        r={ring}
        fill="none"
        stroke={accent}
        strokeOpacity={safeState === "quiet" ? 0.25 : 0.65}
        strokeWidth="2"
      />
      <Path
        d="M17 112 C23 88 39 82 60 82 C81 82 97 88 103 112Z"
        fill="#121310"
        stroke={accent}
        strokeOpacity=".55"
      />
      <Path
        d="M42 83 L47 72 H73 L78 83 L69 94 H51Z"
        fill="#1C1C18"
        stroke={accent}
        strokeOpacity=".7"
      />
      <Path
        d="M34 34 Q60 17 86 34 L82 70 Q76 83 60 87 Q44 83 38 70Z"
        fill="#11120F"
        stroke={accent}
        strokeWidth="1.8"
      />
      <Path
        d="M40 42 Q60 28 80 42 L77 67 Q70 76 60 78 Q50 76 43 67Z"
        fill="url(#core)"
        fillOpacity=".16"
        stroke="#5B5143"
      />
      <Path
        d="M44 54 Q50 50 56 54"
        fill="none"
        stroke="#F3E8D0"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M64 54 Q70 50 76 54"
        fill="none"
        stroke="#F3E8D0"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Ellipse
        cx="60"
        cy="66"
        rx="6"
        ry="1.5"
        fill={accent}
        fillOpacity={safeState === "speaking" ? 0.95 : 0.45}
      />
      <Rect x="57" y="22" width="6" height="6" rx="2" fill={accent} />
    </Svg>
  );
});
