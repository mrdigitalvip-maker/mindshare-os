import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useLanguage } from "@/providers/language-provider";

type Props = {
  pathname: string;
};

export function ModuleAtmosphere({ pathname }: Props) {
  const { resolvedLocale } = useLanguage();
  const en = resolvedLocale === "en";
  const passport = pathname.startsWith("/passport");
  const creator = pathname.startsWith("/creator");

  if (!passport && !creator) return null;

  const accent = passport ? "#7CFFB2" : "#FF6BCB";
  const accentSoft = passport ? "rgba(49, 255, 180, 0.14)" : "rgba(255, 80, 194, 0.14)";
  const accent2 = passport ? "#66D9FF" : "#8D7CFF";
  const title = passport ? "PASSPORT LIVE" : "CREATOR SIGNAL";
  const subtitle = passport
    ? en
      ? "Immersive learning layer"
      : "Camada imersiva de aprendizado"
    : en
      ? "Advanced creative workspace"
      : "Workspace criativo avançado";
  const botLine = passport
    ? en
      ? "Ready for a real-world practice?"
      : "Pronto para praticar uma situação real?"
    : en
      ? "Let's turn your next idea into a stronger signal."
      : "Vamos transformar sua próxima ideia em um sinal mais forte.";
  const action = passport
    ? en
      ? "Practice"
      : "Praticar"
    : en
      ? "Open Copilot"
      : "Abrir Copilot";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.orb, styles.orbTop, { backgroundColor: accentSoft }]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbSide, { backgroundColor: `${accent2}18` }]} />

      <View pointerEvents="none" style={styles.signalDock}>
        <View style={[styles.signalDot, { backgroundColor: accent }]} />
        <View>
          <Text style={styles.signalTitle}>{title}</Text>
          <Text style={styles.signalSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.miniBars}>
          {[0.45, 0.76, 0.58, 0.9].map((height, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                { height: 8 + height * 18, backgroundColor: index % 2 ? accent2 : accent },
              ]}
            />
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(passport ? "/passport/roleplay" : "/creator/copilot")}
        style={({ pressed }) => [
          styles.agent,
          { borderColor: `${accent}55` },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.botShell, { backgroundColor: accentSoft, borderColor: `${accent}55` }]}>
          <View style={[styles.botEye, { backgroundColor: accent }]} />
          <View style={[styles.botEye, { backgroundColor: accent2 }]} />
          <View style={[styles.botMouth, { backgroundColor: `${accent}AA` }]} />
        </View>
        <View style={styles.agentCopy}>
          <Text style={styles.agentName}>{passport ? "Kivi Passport" : "Kivi Creator"}</Text>
          <Text numberOfLines={2} style={styles.agentLine}>{botLine}</Text>
          <Text style={[styles.agentAction, { color: accent }]}>{action} →</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbTop: {
    width: 220,
    height: 220,
    top: -74,
    right: -70,
  },
  orbSide: {
    width: 170,
    height: 170,
    top: 220,
    left: -110,
  },
  signalDock: {
    position: "absolute",
    top: 8,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(7, 10, 16, 0.86)",
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  signalTitle: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  signalSubtitle: {
    color: "#8D98A8",
    fontSize: 9,
    marginTop: 1,
  },
  miniBars: {
    height: 28,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginLeft: 3,
  },
  bar: {
    width: 3,
    borderRadius: 3,
  },
  agent: {
    position: "absolute",
    right: 12,
    bottom: 18,
    width: 278,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(7, 10, 16, 0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  botShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  botEye: {
    width: 7,
    height: 7,
    borderRadius: 7,
  },
  botMouth: {
    position: "absolute",
    bottom: 12,
    width: 18,
    height: 3,
    borderRadius: 4,
  },
  agentCopy: {
    flex: 1,
    minWidth: 0,
  },
  agentName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  agentLine: {
    color: "#AAB3C1",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  agentAction: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
});
