import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { NativeFormModal } from "@/components/native-form-modal";
import { ProfileAvatar } from "@/components/profile-avatar";
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
      setMessage("Perfil salvo.");
    } catch {
      setMessage("Não foi possível salvar o perfil. Tente novamente.");
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
          ? "Notificações ativadas neste dispositivo."
          : `A permissão de notificações está como ${result.permission}.`,
      );
    } catch {
      setMessage("Não foi possível ativar as notificações.");
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
          ? "Notificação de teste enviada."
          : "Nenhum dispositivo ativo. Ative as notificações primeiro.",
      );
    } catch {
      setMessage("Falha ao enviar a notificação de teste.");
    } finally {
      setBusy(false);
    }
  }
  async function checkPermission() {
    setMessage(`Permissão de notificações: ${await notificationPermission()}.`);
  }
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Configurações</Text>
      <Section title="Conta">
        <View style={styles.account}>
          <ProfileAvatar name={profile.data?.fullName} email={session?.user.email} size={52} />
          <View style={styles.accountCopy}>
            <Text numberOfLines={1} style={styles.value}>
              {profile.data?.fullName ?? "Nome não informado"}
            </Text>
            <Text numberOfLines={1} style={styles.help}>
              {session?.user.email ?? "Conta autenticada"}
            </Text>
            <Text style={styles.badge}>Plano: {subscription.data?.plan ?? "Gratuito"}</Text>
          </View>
        </View>
      </Section>
      <Section title="Perfil">
        <Text style={styles.value}>{profile.data?.fullName ?? "Nome não informado"}</Text>
        <Action
          label="Editar nome do perfil"
          onPress={() => {
            setName(profile.data?.fullName ?? "");
            setProfileOpen(true);
          }}
        />
      </Section>
      <Section title="Notificações">
        <Action
          label="Ativar notificações"
          disabled={busy}
          onPress={() => void enableNotifications()}
        />
        <Action
          label="Enviar notificação de teste"
          disabled={busy}
          onPress={() => void testNotification()}
        />
      </Section>
      <Section title="Permissões">
        <Action
          label="Verificar permissão de notificações"
          onPress={() => void checkPermission()}
        />
      </Section>
      <Section title="Assinatura">
        <Text style={styles.value}>
          {subscription.isPending
            ? "Carregando…"
            : `Plano atual: ${subscription.data?.entitlement ?? "Indisponível"}`}
        </Text>
        <Text style={styles.help}>
          Compras estarão disponíveis quando a cobrança nativa do Google Play for implementada.
        </Text>
      </Section>
      <Section title="Privacidade e termos">
        <Text style={styles.help}>
          Privacidade · Termos de Serviço. Nenhum checkout externo é aberto.
        </Text>
      </Section>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => void logout()} style={styles.logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
      <NativeFormModal
        visible={profileOpen}
        title="Editar nome do perfil"
        placeholder="Seu nome"
        value={name}
        onChange={setName}
        busy={busy}
        error={message?.includes("Não foi possível") ? message : null}
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
  page: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.text },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...typography.label, color: colors.primaryBright },
  account: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  accountCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  badge: { ...typography.caption, alignSelf: "flex-start", color: colors.primaryBright },
  value: { ...typography.body, color: colors.text },
  help: { ...typography.body, color: colors.textMuted },
  action: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
