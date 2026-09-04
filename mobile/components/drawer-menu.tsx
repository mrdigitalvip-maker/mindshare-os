import { LocalizedCopy } from "@/components/localized-copy";
import { router, type Href, usePathname } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProfileAvatar } from "@/components/profile-avatar";
import { useLogout } from "@/hooks/use-logout";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { isDrawerRouteSelected, type DrawerRoute } from "@/lib/drawer-navigation";
import { getDisplayPlan } from "@/lib/presentation";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";

type IconName =
  "home" | "assistant" | "projects" | "tasks" | "studies" | "premium" | "settings" | "logout";
type Item = { label: string; href: DrawerRoute; icon: IconName };

export const drawerSections: Array<{ title: string; items: Item[] }> = [
  {
    title: "PRINCIPAL",
    items: [
      { label: "Início", href: "/dashboard", icon: "home" },
      { label: "Assistente", href: "/assistant", icon: "assistant" },
    ],
  },
  {
    title: "TRABALHO",
    items: [
      { label: "Projetos", href: "/projects", icon: "projects" },
      { label: "Tarefas", href: "/productivity", icon: "tasks" },
    ],
  },
  { title: "DESENVOLVIMENTO", items: [{ label: "Estudos", href: "/studies", icon: "studies" }] },
  {
    title: "CONTA",
    items: [
      { label: "Premium", href: "/premium", icon: "premium" },
      { label: "Configurações", href: "/settings", icon: "settings" },
    ],
  },
];

function DrawerIcon({ name, active = false }: { name: IconName; active?: boolean }) {
  const color = active ? colors.primaryBright : colors.textMuted;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <Svg accessibilityElementsHidden width={21} height={21} viewBox="0 0 24 24">
      {name === "home" && (
        <>
          <Path {...common} d="M3 11.5 12 4l9 7.5" />
          <Path {...common} d="M5.5 10v10h13V10M9.5 20v-6h5v6" />
        </>
      )}
      {name === "assistant" && (
        <>
          <Path
            {...common}
            d="M12 3l1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z"
          />

          <Path {...common} d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
        </>
      )}
      {name === "projects" && <Path {...common} d="M3 7h7l2-2h9v14H3V7Z" />}
      {name === "tasks" && (
        <>
          <Polyline {...common} points="4,7 6,9 9,5" />
          <Path {...common} d="M11 7h9M4 15l2 2 3-4M11 15h9" />
        </>
      )}
      {name === "studies" && (
        <>
          <Path {...common} d="M4 5.5A3.5 3.5 0 0 1 7.5 4H12v16H7.5A3.5 3.5 0 0 0 4 21V5.5Z" />
          <Path {...common} d="M20 5.5A3.5 3.5 0 0 0 16.5 4H12v16h4.5A3.5 3.5 0 0 1 20 21V5.5Z" />
        </>
      )}
      {name === "premium" && (
        <>
          <Path {...common} d="m3 8 4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
          <Path {...common} d="M6 21h12" />
        </>
      )}
      {name === "settings" && (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path
            {...common}
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
          />
        </>
      )}
      {name === "logout" && (
        <>
          <Path {...common} d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
        </>
      )}
    </Svg>
  );
}

export function DrawerMenu({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { session } = useAuth();
  const profile = useProfile();
  const subscription = useSubscription();
  const logout = useLogout();
  const actionLocked = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const identity = profile.data;
  const displayName = identity?.displayName ?? "Conta NEXORA";
  const email = identity?.email ?? session?.user.email ?? "Conta autenticada";
  const plan = subscription.isPending
    ? "Consultando plano…"
    : subscription.isError
      ? "Plano indisponível"
      : getDisplayPlan(subscription.data?.plan);

  function navigate(href: Href) {
    if (actionLocked.current) return;
    actionLocked.current = true;
    onClose();
    // Let Android dismiss the native Modal before changing the router state.
    requestAnimationFrame(() => {
      router.navigate(href);
      actionLocked.current = false;
    });
  }

  async function handleLogout() {
    if (loggingOut || actionLocked.current) return;
    actionLocked.current = true;
    setLoggingOut(true);
    try {
      await logout();
      onClose();
    } catch {
      Alert.alert("Não foi possível sair", "Verifique sua conexão e tente novamente.");
    } finally {
      actionLocked.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={false}
      navigationBarTranslucent={false}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <View style={[styles.drawer, { width: Math.min(width * 0.86, 360) }]}>
          <ScrollView
            contentContainerStyle={[
              styles.drawerContent,
              { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandRow}>
              <Text accessibilityRole="header" style={styles.brand}>
                <LocalizedCopy copyKey="legacy.feff5d348e1b" />
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar menu"
                hitSlop={4}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>
                  <LocalizedCopy copyKey="legacy.1261a8aa09a4" />
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir configurações da conta"
              onPress={() => navigate("/settings")}
              style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
            >
              <ProfileAvatar
                imageUrl={identity?.avatarUrl}
                name={displayName}
                email={email}
                size={54}
              />

              <View style={styles.identityCopy}>
                <Text numberOfLines={1} style={styles.identityName}>
                  {displayName}
                </Text>
                <Text numberOfLines={1} style={styles.identityEmail}>
                  {email}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.plan, subscription.isError && styles.neutralPlan]}
                >
                  {plan}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <View style={styles.navigation}>
              {drawerSections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.eyebrow}>{section.title}</Text>
                  {section.items.map((item) => {
                    const active = isDrawerRouteSelected(pathname, item.href);
                    return (
                      <Pressable
                        key={item.href}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        accessibilityState={{ selected: active }}
                        onPress={() => navigate(item.href)}
                        style={({ pressed }) => [
                          styles.navRow,
                          active && styles.activeNavRow,
                          pressed && styles.pressed,
                        ]}
                      >
                        {active ? <View style={styles.activeIndicator} /> : null}
                        <DrawerIcon name={item.icon} active={active} />
                        <Text style={[styles.navText, active && styles.activeNavText]}>
                          {item.label}
                        </Text>
                        <Text style={styles.chevron}>›</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
              accessibilityState={{ disabled: loggingOut }}
              disabled={loggingOut}
              onPress={() => void handleLogout()}
              style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
            >
              {loggingOut ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <DrawerIcon name="logout" />
              )}
              <Text style={styles.logoutText}>{loggingOut ? "Saindo…" : "Sair da conta"}</Text>
            </Pressable>
          </ScrollView>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar menu"
          onPress={onClose}
          style={styles.scrim}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  drawer: {
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerContent: { flexGrow: 1, paddingHorizontal: spacing.md },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.72)" },
  brandRow: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  brand: { fontSize: 17, fontWeight: "700", letterSpacing: 2.5, color: colors.text },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  closeText: { color: colors.text, fontSize: 27, lineHeight: 29, fontWeight: "300" },
  identity: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  identityCopy: { flex: 1, minWidth: 0, gap: 1 },
  identityName: { ...typography.label, fontSize: 16, lineHeight: 21, color: colors.text },
  identityEmail: { ...typography.caption, color: colors.textMuted },
  plan: { ...typography.caption, color: colors.primaryBright, minHeight: 17 },
  neutralPlan: { color: colors.textMuted },
  navigation: { gap: spacing.md },
  section: { gap: spacing.xs },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginBottom: 2,
  },
  navRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  activeNavRow: { backgroundColor: colors.surfaceRaised },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 2,
    borderRadius: 2,
    backgroundColor: colors.primaryBright,
  },
  navText: { ...typography.body, flex: 1, color: colors.textMuted },
  activeNavText: { ...typography.label, fontSize: 16, lineHeight: 23, color: colors.text },
  chevron: { fontSize: 22, color: colors.textMuted },
  logout: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutText: { ...typography.label, color: colors.danger },
  pressed: { opacity: 0.72 },
});
