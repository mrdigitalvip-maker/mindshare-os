import { memo } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { normalizeAmplitude, normalizeNexoraState, type NexoraState } from "@/lib/nexora-state";

const stateColors: Record<NexoraState, string> = {
  idle: "#8B7CFF",
  listening: "#5DE2FF",
  thinking: "#B6AEFF",
  speaking: "#64E3B3",
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
      <Circle cx="60" cy="60" r="38" fill="#101522" stroke={accent} strokeWidth="2.5" />
      <Path
        d="M38 70 C43 39 77 39 82 70 C73 62 68 57 60 57 C52 57 47 62 38 70Z"
        fill="url(#core)"
      />
      <Circle cx="49" cy="57" r="3" fill="#070A12" />
      <Circle cx="71" cy="57" r="3" fill="#070A12" />
    </Svg>
  );
});
