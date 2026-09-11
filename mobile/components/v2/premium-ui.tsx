import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { LocalizedCopy } from "@/components/localized-copy";

export function PremiumSurface({
  children,
  illuminated = false,
  style,
}: PropsWithChildren<{ illuminated?: boolean; style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.surface, illuminated && styles.illuminated, style]}>{children}</View>;
}

export function V2SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIdentity}>
        <View style={styles.marker} />
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function V2Progress({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: normalized }}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${normalized}%` }]} />
      </View>
    </View>
  );
}

export function V2SectionState({
  loading,
  error,
  retry,
  children,
}: PropsWithChildren<{
  loading: boolean;
  error: boolean;
  retry: () => void;
  children?: ReactNode;
}>) {
  if (loading)
    return (
      <View accessibilityLabel="Carregando seção" style={styles.skeleton}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
    );
  if (error)
    return (
      <PremiumSurface style={styles.state}>
        <Text style={styles.stateTitle}>
          <LocalizedCopy copyKey="legacy.db7ae91b77a0" />
        </Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>
            <LocalizedCopy copyKey="legacy.da2574475ed7" />
          </Text>
        </Pressable>
      </PremiumSurface>
    );
  return <>{children}</>;
}

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  illuminated: {
    borderColor: colors.borderActive,
    backgroundColor: colors.surfaceRaised,
    ...shadows.illuminated,
  },
  sectionHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionIdentity: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  marker: {
    width: 3,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryBright,
  },
  sectionTitle: { ...typography.eyebrow, color: colors.textSecondary, letterSpacing: 1.4 },
  link: { ...typography.label, color: colors.primaryBright, paddingVertical: spacing.sm },
  track: {
    height: 5,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryBright },
  skeleton: {
    height: 96,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  skeletonLine: {
    height: 12,
    width: "72%",
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
  skeletonLineShort: {
    height: 9,
    width: "44%",
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
  state: { gap: spacing.sm, padding: spacing.md },
  stateTitle: { ...typography.label, color: colors.text },
  retry: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" },
  retryText: { ...typography.label, color: colors.primaryBright },
});
