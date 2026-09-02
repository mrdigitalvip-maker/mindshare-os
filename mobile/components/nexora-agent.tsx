import { memo, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
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
const stateLabels: Record<NexoraState, string> = {
  idle: "NEXORA disponível",
  listening: "NEXORA ouvindo",
  thinking: "NEXORA pensando",
  speaking: "NEXORA respondendo",
  attention: "NEXORA precisa da sua atenção",
  success: "NEXORA confirmou a ação",
  quiet: "NEXORA em modo silencioso",
};
const AnimatedG = Animated.createAnimatedComponent(G);

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
  const blink = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    blink.setValue(1);
    if (reduceMotion || safeState === "quiet") return;
    let disposed = false;
    const scheduleBlink = () => {
      const delay = 2800 + Math.floor(Math.random() * 3600);
      timer.current = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.08, duration: 70, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
        ]).start(() => {
          if (!disposed) scheduleBlink();
        });
      }, delay);
    };
    scheduleBlink();
    return () => {
      disposed = true;
      if (timer.current) clearTimeout(timer.current);
      blink.stopAnimation();
    };
  }, [blink, reduceMotion, safeState]);

  useEffect(() => {
    float.stopAnimation();
    pulse.stopAnimation();
    if (reduceMotion || safeState === "quiet") {
      float.setValue(0);
      pulse.setValue(0);
      return;
    }
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -1.8,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const glowing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: safeState === "thinking" ? 900 : 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: safeState === "thinking" ? 900 : 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    breathing.start();
    glowing.start();
    return () => {
      breathing.stop();
      glowing.stop();
    };
  }, [float, pulse, reduceMotion, safeState]);

  const mouthOpen = safeState === "speaking" ? Math.max(1.5, 2 + safeAmplitude * 4) : 1.15;
  const glowOpacity = useMemo(
    () =>
      safeState === "quiet"
        ? 0.18
        : safeState === "attention" || safeState === "success"
          ? 0.72
          : 0.48,
    [safeState],
  );
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
        transform: [{ translateY: float }],
      }}
    >
      <Svg
        accessible
        accessibilityLabel={stateLabels[safeState]}
        accessibilityRole="image"
        width={size}
        height={size}
        viewBox="0 0 120 120"
      >
        <Defs>
          <LinearGradient id="shell" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#292A29" />
            <Stop offset=".55" stopColor="#0C0D0D" />
            <Stop offset="1" stopColor="#1A1713" />
          </LinearGradient>
          <RadialGradient id="face">
            <Stop offset="0" stopColor={accent} stopOpacity=".2" />
            <Stop offset="1" stopColor="#080909" stopOpacity=".96" />
          </RadialGradient>
        </Defs>
        <Circle cx="60" cy="58" r="51" fill={accent} fillOpacity={glowOpacity * 0.08} />
        <Circle
          cx="60"
          cy="58"
          r="48"
          fill="none"
          stroke={accent}
          strokeOpacity={glowOpacity}
          strokeWidth="1.2"
          strokeDasharray={safeState === "listening" ? "3 4" : undefined}
        />
        <Path
          d="M22 111C27 91 40 84 60 84s33 7 38 27"
          fill="url(#shell)"
          stroke={accent}
          strokeOpacity=".38"
        />
        <Path
          d="M35 34Q60 17 85 34l-3 36Q75 84 60 87Q45 84 38 70Z"
          fill="url(#shell)"
          stroke={accent}
          strokeWidth="1.4"
        />
        <Path
          d="M41 42Q60 30 79 42l-2 25Q69 77 60 79Q51 77 43 67Z"
          fill="url(#face)"
          stroke="#685846"
          strokeOpacity=".7"
        />
        <AnimatedG opacity={blink}>
          <Path
            d="M46 54Q51 51 56 54"
            fill="none"
            stroke="#FFF3D9"
            strokeWidth={safeState === "listening" ? 3.8 : 3}
            strokeLinecap="round"
          />
          <Path
            d="M64 54Q69 51 74 54"
            fill="none"
            stroke="#FFF3D9"
            strokeWidth={safeState === "listening" ? 3.8 : 3}
            strokeLinecap="round"
          />
        </AnimatedG>
        <Ellipse
          cx="60"
          cy="66"
          rx={safeState === "speaking" ? 5 : 6}
          ry={mouthOpen}
          fill={accent}
          fillOpacity={safeState === "speaking" ? 0.95 : 0.48}
        />
        <Rect x="57" y="22" width="6" height="5" rx="2.5" fill={accent} />
        <Circle
          cx="60"
          cy="96"
          r="4"
          fill={accent}
          fillOpacity={safeState === "success" ? 0.95 : 0.5}
        />
      </Svg>
    </Animated.View>
  );
});
