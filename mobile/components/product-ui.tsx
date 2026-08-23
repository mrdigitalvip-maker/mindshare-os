import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/lib/theme";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/providers/auth-provider";
import { ProfileAvatar } from "@/components/profile-avatar";

export { DrawerMenu } from "@/components/drawer-menu";

export function AppHeader({ onMenu }: { onMenu(): void }) {
  const profile = useProfile();
  const { session } = useAuth();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu de navegação"
        onPress={onMenu}
        style={styles.icon}
      >
        <Text style={styles.iconText}>☰</Text>
      </Pressable>
      <View accessibilityRole="header" style={styles.search}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.searchText}>
          Command Center
        </Text>
        <Text style={styles.gold}>✦</Text>
      </View>
      <Pressable
        accessibilityLabel="Configurações"
        onPress={() => router.push("/settings")}
        style={styles.avatarButton}
      >
        <ProfileAvatar
          imageUrl={profile.data?.avatarUrl}
          name={profile.data?.displayName}
          email={session?.user.email}
          size={36}
        />
      </Pressable>
    </View>
  );
}

export function StandardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.standardHeader}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function ModuleCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: Href;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.module, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.moduleIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={styles.moduleCopy}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  standardHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...typography.title, color: colors.text, flexShrink: 1 },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  iconText: { color: colors.text, fontSize: 22 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  searchText: { ...typography.label, color: colors.textMuted, flex: 1, marginRight: spacing.sm },
  gold: { color: colors.primaryBright },
  avatarButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chevron: { fontSize: 24, color: colors.textMuted },
  module: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moduleIcon: { fontSize: 24, color: colors.primaryBright },
  moduleTitle: { ...typography.heading, fontSize: 18, lineHeight: 23, color: colors.text },
  moduleCopy: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
});
