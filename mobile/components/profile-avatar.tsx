import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, typography } from "@/lib/theme";

function initialsFor(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0]?.trim() || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "•";
  return `${parts[0][0]}${parts.length > 1 ? parts.at(-1)?.[0] : ""}`.toUpperCase();
}

export function ProfileAvatar({
  imageUrl,
  name,
  email,
  size = 38,
}: {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
}) {
  const safeUrl = imageUrl?.trim().startsWith("https://") ? imageUrl.trim() : null;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [safeUrl]);
  const initials = useMemo(() => initialsFor(name, email), [name, email]);
  const label = name?.trim() ? `Perfil de ${name.trim()}` : "Perfil da conta";
  const frame = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View accessibilityLabel={label} accessibilityRole="image" style={[styles.frame, frame]}>
      {safeUrl && !failed ? (
        <Image source={{ uri: safeUrl }} onError={() => setFailed(true)} style={frame} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.34) }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceRaised,
  },
  initials: { ...typography.label, color: colors.primaryBright },
});
