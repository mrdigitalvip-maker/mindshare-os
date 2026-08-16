import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { NativeFormModal } from "@/components/native-form-modal";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  notificationPermission,
  registerNativeNotifications,
  sendTestNotification,
} from "@/services/notification-service";
import { updateProfileName } from "@/services/profile-service";
export default function Settings() {
  const { session } = useAuth();
  const profile = useProfile();
  const subscription = useSubscription();
  const client = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(profile.data?.fullName ?? "");
  async function saveName() {
    if (!session) return;
    setBusy(true);
    try {
      await updateProfileName(session.user.id, name);
      await client.invalidateQueries({ queryKey: queryKeys.profile });
      setProfileOpen(false);
      setMessage("Profile saved.");
    } catch {
      setMessage("Profile could not be saved. Retry.");
    } finally {
      setBusy(false);
    }
  }
  async function enableNotifications() {
    if (!session || busy) return;
    setBusy(true);
    try {
      const result = await registerNativeNotifications(session.user.id);
      setMessage(
        result.registered
          ? "Notifications enabled on this device."
          : `Notification permission is ${result.permission}.`,
      );
    } catch {
      setMessage("Notifications could not be enabled. Verify EAS configuration.");
    } finally {
      setBusy(false);
    }
  }
  async function testNotification() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await sendTestNotification();
      setMessage(
        result.accepted
          ? "Test notification accepted by the provider."
          : "No active device registration. Enable notifications first.",
      );
    } catch {
      setMessage("Test delivery failed. Verify push-send deployment.");
    } finally {
      setBusy(false);
    }
  }
  async function checkPermission() {
    setMessage(`Notification permission is ${await notificationPermission()}.`);
  }
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Settings</Text>
      <Section title="Account">
        <Text style={styles.value}>{session?.user.email ?? "Authenticated account"}</Text>
      </Section>
      <Section title="Profile">
        <Text style={styles.value}>{profile.data?.fullName ?? "Name not set"}</Text>
        <Action
          label="Edit profile name"
          onPress={() => {
            setName(profile.data?.fullName ?? "");
            setProfileOpen(true);
          }}
        />
      </Section>
      <Section title="Notifications">
        <Action
          label="Enable native notifications"
          disabled={busy}
          onPress={() => void enableNotifications()}
        />
        <Action
          label="Send test notification"
          disabled={busy}
          onPress={() => void testNotification()}
        />
      </Section>
      <Section title="Permissions">
        <Action label="Check notification permission" onPress={() => void checkPermission()} />
      </Section>
      <Section title="Subscription">
        <Text style={styles.value}>
          {subscription.isPending ? "Loading…" : (subscription.data?.entitlement ?? "Unavailable")}
        </Text>
        <Text style={styles.help}>
          Purchases are unavailable until Google Play Billing is implemented.
        </Text>
      </Section>
      <Section title="Legal">
        <Text style={styles.help}>
          Privacy and legal terms remain governed by the NEXORA account agreements. No external
          checkout is opened.
        </Text>
      </Section>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
      <NativeFormModal
        visible={profileOpen}
        title="Profile name"
        placeholder="Your name"
        value={name}
        onChange={setName}
        busy={busy}
        error={message?.includes("could not") ? message : null}
        onClose={() => setProfileOpen(false)}
        onSave={() => void saveName()}
      />
    </ScrollView>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </View>
  );
}
function Action({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.action}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.text },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...typography.heading, color: colors.text },
  value: { ...typography.body, color: colors.text },
  help: { ...typography.body, color: colors.textMuted },
  action: {
    minHeight: 48,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  actionText: { ...typography.label, color: colors.primaryBright },
  message: { ...typography.body, color: colors.textMuted },
  logout: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { ...typography.label, color: colors.danger, textAlign: "center" },
});
