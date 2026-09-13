import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

import { colors, radius, typography } from "@/lib/theme";

const KIVRYN_ICON = require("@/assets/branding/nexora-app-icon-master.png");

export type KivrynCoreState = "idle" | "thinking" | "listening" | "speaking" | "attention";

const stateCopy: Record<KivrynCoreState, string> = {
  idle: "ONLINE",
  thinking: "THINKING",
  listening: "LISTENING",
  speaking: "SPEAKING",
  attention: "ATTENTION",
};

export function KivrynCore({
  size = 72,
  state = "idle",
  showLabel = false,
}: {
  size?: number;
  state?: KivrynCoreState;
  showLabel?: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "idle") {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, state]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.08] });
  const accent = state === "attention" ? colors.danger : state === "listening" ? colors.violet : colors.primaryBright;

  return (
    <View style={styles.wrap}>
      <View style={[styles.stage, { width: size, height: size, borderRadius: size / 2 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: accent,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <View
          style={[
            styles.outerRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: `${accent}55`,
            },
          ]}
        >
          <View
            style={[
              styles.innerRing,
              {
                width: size * 0.76,
                height: size * 0.76,
                borderRadius: (size * 0.76) / 2,
              },
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              source={KIVRYN_ICON}
              style={{ width: size * 0.56, height: size * 0.56, borderRadius: size * 0.17 }}
            />
          </View>
          <View style={[styles.signal, { backgroundColor: accent }]} />
        </View>
      </View>
      {showLabel ? <Text style={[styles.label, { color: accent }]}>{stateCopy[state]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", gap: 7 },
  stage: { alignItems: "center", justifyContent: "center" },
  pulseRing: { position: "absolute", borderWidth: 1 },
  outerRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(5, 13, 22, 0.98)",
  },
  innerRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: colors.surfaceRaised,
  },
  signal: {
    position: "absolute",
    right: 3,
    bottom: 8,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.background,
  },
  label: { ...typography.caption, fontSize: 9, fontWeight: "800", letterSpacing: 1.6 },
});
