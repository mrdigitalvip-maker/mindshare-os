import { router, type Href, usePathname } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/lib/theme";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/providers/auth-provider";
import { ProfileAvatar } from "@/components/profile-avatar";

export function AppHeader({ onMenu }: { onMenu(): void }) {
  const profile = useProfile();
  const { session } = useAuth();
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Abrir menu" onPress={onMenu} style={styles.icon}>
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

const sections: Array<{ title: string; items: Array<[string, Href]> }> = [
  {
    title: "PRINCIPAL",
    items: [
      ["Início", "/dashboard"],
      ["Assistente", "/assistant"],
    ],
  },
  {
    title: "ESPAÇO DE TRABALHO",
    items: [
      ["Projetos", "/projects"],
      ["Tarefas", "/productivity"],
    ],
  },
  { title: "CRESCIMENTO", items: [["Estudos", "/studies"]] },
  {
    title: "CONTA",
    items: [
      ["Premium", "/premium"],
      ["Configurações", "/settings"],
    ],
  },
];
export function DrawerMenu({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView
          style={styles.drawer}
          contentContainerStyle={[
            styles.drawerContent,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brand}>NEXORA</Text>
            <Pressable accessibilityLabel="Fechar menu" onPress={onClose} style={styles.icon}>
              <Text style={styles.iconText}>×</Text>
            </Pressable>
          </View>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.eyebrow}>{section.title}</Text>
              {section.items.map(([label, href]) => (
                <Pressable
                  key={label}
                  onPress={() => {
                    onClose();
                    router.navigate(href);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: pathname === href }}
                  style={[styles.navRow, pathname === href && styles.activeNavRow]}
                >
                  <Text style={styles.gold}>◇</Text>
                  <Text style={styles.navText}>{label}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
        <Pressable accessibilityLabel="Fechar menu" onPress={onClose} style={styles.scrim} />
      </View>
    </Modal>
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
  overlay: { flex: 1, flexDirection: "row" },
  drawer: {
    width: "82%",
    maxWidth: 340,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerContent: { paddingHorizontal: spacing.md, gap: spacing.md },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.65)" },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 20, fontWeight: "700", letterSpacing: 4, color: colors.text },
  section: { gap: spacing.xs },
  eyebrow: { ...typography.eyebrow, color: colors.textMuted, marginBottom: spacing.xs },
  navRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  activeNavRow: { backgroundColor: colors.surfaceRaised },
  navText: { ...typography.body, flex: 1, color: colors.text },
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
