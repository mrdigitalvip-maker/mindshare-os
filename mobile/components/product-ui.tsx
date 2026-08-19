import { router, type Href } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/lib/theme";

export function AppHeader({ onMenu }: { onMenu(): void }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Abrir menu" onPress={onMenu} style={styles.icon}>
        <Text style={styles.iconText}>☰</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Conversar com a NEXORA"
        onPress={() => router.push("/assistant")}
        style={styles.search}
      >
        <Text style={styles.searchText}>Pergunte à NEXORA</Text>
        <Text style={styles.gold}>✦</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Configurações"
        onPress={() => router.push("/settings")}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>N</Text>
      </Pressable>
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
      ["Produtividade", "/productivity"],
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
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={styles.drawer} contentContainerStyle={styles.drawerContent}>
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
                    router.push(href);
                  }}
                  style={styles.navRow}
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
  searchText: { ...typography.label, color: colors.textMuted },
  gold: { color: colors.primaryBright },
  avatar: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceRaised,
  },
  avatarText: { ...typography.label, color: colors.primaryBright },
  overlay: { flex: 1, flexDirection: "row" },
  drawer: {
    width: "84%",
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerContent: { padding: spacing.lg, gap: spacing.lg },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.65)" },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 20, fontWeight: "700", letterSpacing: 4, color: colors.text },
  section: { gap: spacing.xs },
  eyebrow: { ...typography.eyebrow, color: colors.textMuted, marginBottom: spacing.xs },
  navRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  navText: { ...typography.body, flex: 1, color: colors.text },
  chevron: { fontSize: 24, color: colors.textMuted },
  module: {
    minHeight: 104,
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
  moduleTitle: { ...typography.heading, fontSize: 19, color: colors.text },
  moduleCopy: { ...typography.body, fontSize: 14, color: colors.textMuted },
});
