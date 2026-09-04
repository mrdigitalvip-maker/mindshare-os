import { LocalizedCopy } from "@/components/localized-copy";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { NativeFormModal } from "@/components/native-form-modal";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useLogout } from "@/hooks/use-logout";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { LEGAL_URLS } from "@/lib/legal";
import { queryKeys } from "@/lib/query-keys";
import {
  notificationCopy,
  notificationReadiness,
  subscriptionPlanLabel,
  testPushSucceeded,
  validateProfileName,
  type NotificationReadiness,
} from "@/lib/settings-state";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import {
  disableCurrentPushDevice,
  getNotificationDeviceState,
  registerNativeNotifications,
  scheduleLocalNotificationTest,
  sendTestNotification,
} from "@/services/notification-service";
import { updateProfileName } from "@/services/profile-service";
import { useLanguage } from "@/providers/language-provider";
import type { LanguagePreference } from "@/i18n";

// NXR-033 invariant copy: notificação local, sem verificar a entrega por servidor
export default function Settings() {
  const { languagePreference, setLanguagePreference, t } = useLanguage();
  const { session } = useAuth();
  const profile = useProfile();
  const subscription = useSubscription();
  const logout = useLogout();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(""),
    [profileMessage, setProfileMessage] = useState<string>(),
    [profileError, setProfileError] = useState<string>();
  const [noticeState, setNoticeState] = useState<NotificationReadiness>(),
    [noticeMessage, setNoticeMessage] = useState<string>(),
    [noticeError, setNoticeError] = useState(false),
    [sessionError, setSessionError] = useState<string>();
  const refreshNotifications = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const state = await getNotificationDeviceState(session.user.id);
      setNoticeState(
        notificationReadiness(
          state.permission,
          state.deviceRegistered,
          state.channelReady,
          state.projectConfigAvailable,
        ),
      );
      setNoticeError(false);
    } catch {
      setNoticeError(true);
    }
  }, [session?.user.id]);
  const refetchProfile = profile.refetch;
  const refetchSubscription = subscription.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
      void refetchProfile();
      void refetchSubscription();
    }, [refreshNotifications, refetchProfile, refetchSubscription]),
  );
  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([refreshNotifications(), profile.refetch(), subscription.refetch()]);
    setRefreshing(false);
  }
  async function saveName() {
    if (!session || busy) return;
    const error = validateProfileName(name);
    if (error) {
      setProfileError(error);
      return;
    }
    if (name.trim() === profile.data?.fullName?.trim()) {
      setProfileOpen(false);
      return;
    }
    setBusy(true);
    setProfileError(undefined);
    try {
      await updateProfileName(session.user.id, name.trim());
      await client.invalidateQueries({ queryKey: queryKeys.profile });
      await profile.refetch();
      setProfileOpen(false);
      setProfileMessage("Nome atualizado.");
    } catch {
      setProfileError("Não foi possível atualizar o nome. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function enable() {
    if (!session || busy) return;
    if (noticeState === "blocked") {
      try {
        await Linking.openSettings();
      } catch {
        setNoticeMessage("Não foi possível abrir as configurações do aparelho.");
      }
      return;
    }
    setBusy(true);
    try {
      const r = await registerNativeNotifications(session.user.id);
      setNoticeState(notificationReadiness(r.permission, r.registered));
      setNoticeMessage(
        r.registered
          ? "Notificações ativadas neste dispositivo."
          : "Não foi possível ativar as notificações.",
      );
    } catch (error) {
      const category = error instanceof Error ? error.message : "unexpected";
      setNoticeMessage(
        category === "project-config"
          ? "O push remoto não está configurado nesta versão."
          : category === "channel"
            ? "Não foi possível preparar o canal de notificações neste aparelho."
            : category === "token"
              ? "Não foi possível obter a identificação deste aparelho para push remoto."
              : category === "registration"
                ? "Não foi possível confirmar o registro deste aparelho."
                : "Não foi possível ativar as notificações.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function testNotice() {
    if (busy || noticeState !== "active") return;
    setBusy(true);
    try {
      setNoticeMessage(
        testPushSucceeded(await sendTestNotification())
          ? "Envio aceito pelo servidor. Confirme o recebimento neste aparelho."
          : "O servidor não aceitou o teste remoto neste momento.",
      );
    } catch {
      setNoticeMessage("Não foi possível solicitar o teste remoto neste momento.");
    } finally {
      setBusy(false);
    }
  }
  async function testLocalNotice() {
    if (busy || (noticeState !== "active" && noticeState !== "needs-registration")) return;
    setBusy(true);
    try {
      await scheduleLocalNotificationTest();
      setNoticeMessage("Teste agendado. Aguarde alguns segundos.");
    } catch {
      setNoticeMessage("Não foi possível agendar o teste neste aparelho.");
    } finally {
      setBusy(false);
    }
  }
  async function disableDevice() {
    if (!session || busy) return;
    setBusy(true);
    try {
      await disableCurrentPushDevice(session.user.id);
      await refreshNotifications();
      setNoticeMessage("Este dispositivo foi desativado. A permissão do Android permanece ativa.");
    } catch {
      setNoticeMessage("Não foi possível desativar este dispositivo. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setSessionError(undefined);
    try {
      await logout();
    } catch {
      setSessionError("Não foi possível sair. Verifique sua conexão e tente novamente.");
      setBusy(false);
    }
  }
  const plan = subscriptionPlanLabel(subscription.data?.entitlement),
    notice = noticeState ? notificationCopy[noticeState] : null;
  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={colors.primaryBright}
        />
      }
      contentContainerStyle={s.page}
    >
      <Text style={s.title}>{t("settings.title")}</Text>
      <Text style={s.help}>
        <LocalizedCopy copyKey="legacy.1bc8dcc7c1b6" />
      </Text>
      <Section title={t("settings.language").toUpperCase()}>
        <Text style={s.help}>{t("settings.languageHelp")}</Text>
        {(["system", "pt-BR", "en"] as LanguagePreference[]).map((value) => (
          <Action
            key={value}
            label={`${languagePreference === value ? "✓ " : ""}${t(`language.${value}` as "language.system" | "language.pt-BR" | "language.en")}`}
            disabled={false}
            action={() => void setLanguagePreference(value)}
          />
        ))}
      </Section>
      <Section title="CONTA">
        <View
          style={s.account}
          accessible
          accessibilityLabel={`${profile.data?.displayName ?? "Conta NEXORA"}, ${session?.user.email ?? "email indisponível"}, plano ${plan}`}
        >
          <ProfileAvatar
            imageUrl={profile.data?.avatarUrl}
            name={profile.data?.displayName}
            email={session?.user.email}
            size={60}
          />

          <View style={s.accountCopy}>
            <Text style={s.name}>
              {profile.isPending
                ? "Carregando perfil…"
                : (profile.data?.fullName ?? "Nome não informado")}
            </Text>
            <Text style={s.email}>{session?.user.email ?? "Email indisponível"}</Text>
            {subscription.isError ? (
              <Text style={s.error}>
                <LocalizedCopy copyKey="legacy.8858e8bd29be" />
              </Text>
            ) : (
              <Text style={s.badge}>Plano {subscription.isPending ? "carregando…" : plan}</Text>
            )}
          </View>
        </View>
        {profile.isError ? (
          <Retry
            text="Não foi possível carregar os dados do perfil."
            action={() => void profile.refetch()}
          />
        ) : null}
      </Section>
      <Section title="PERFIL">
        <Text style={s.help}>
          <LocalizedCopy copyKey="legacy.43ec607cb178" />
        </Text>
        <Action
          label="Editar nome"
          disabled={busy || profile.isError}
          action={() => {
            setName(profile.data?.fullName ?? "");
            setProfileError(undefined);
            setProfileOpen(true);
          }}
        />

        {profileMessage ? <Feedback text={profileMessage} /> : null}
      </Section>
      <Section title="NOTIFICAÇÕES">
        {noticeError ? (
          <Retry
            text="Não foi possível verificar as notificações."
            action={() => void refreshNotifications()}
          />
        ) : notice ? (
          <>
            <Text
              accessibilityLiveRegion="polite"
              style={noticeState === "active" ? s.success : s.value}
            >
              {notice.title}
            </Text>
            <Text style={s.help}>{notice.description}</Text>
            {notice.action ? (
              <Action label={notice.action} disabled={busy} action={() => void enable()} />
            ) : null}
            {noticeState === "active" ||
            noticeState === "needs-registration" ||
            noticeState === "project-config" ? (
              <>
                <Text style={s.subheading}>
                  <LocalizedCopy copyKey="legacy.df84bf81e8e3" />
                </Text>
                <Text style={s.help}>
                  <LocalizedCopy copyKey="legacy.ece539f8f411" />
                </Text>
                <Action
                  secondary
                  label="Agendar teste local"
                  disabled={busy}
                  action={() => void testLocalNotice()}
                />

                {noticeState === "active" ? (
                  <>
                    <Text style={s.subheading}>
                      <LocalizedCopy copyKey="legacy.51ec3c7f0d77" />
                    </Text>
                    <Text style={s.help}>
                      <LocalizedCopy copyKey="legacy.cdaf0be3fdd8" />
                    </Text>
                    <Action
                      secondary
                      label="Solicitar teste remoto"
                      disabled={busy}
                      action={() => void testNotice()}
                    />
                  </>
                ) : null}
                {noticeState === "active" ? (
                  <Action
                    secondary
                    label="Desativar neste dispositivo"
                    disabled={busy}
                    action={() =>
                      Alert.alert(
                        "Desativar neste dispositivo",
                        "A NEXORA deixará de usar o registro deste aparelho. A permissão do Android poderá continuar ativa.",
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Desativar",
                            style: "destructive",
                            onPress: () => void disableDevice(),
                          },
                        ],
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <Text style={s.help}>
            <LocalizedCopy copyKey="legacy.4da041399fb9" />
          </Text>
        )}
        {noticeMessage ? <Feedback text={noticeMessage} /> : null}
      </Section>
      <Section title="ASSINATURA">
        {subscription.isPending ? (
          <Text style={s.help}>
            <LocalizedCopy copyKey="legacy.e4c00da111a2" />
          </Text>
        ) : subscription.isError ? (
          <Retry
            text="Não foi possível verificar seu plano."
            action={() => void subscription.refetch()}
          />
        ) : (
          <>
            <Text style={s.value}>Plano atual: {plan}</Text>
            <Action
              label={plan === "Premium" ? "Gerenciar assinatura" : "Conhecer Premium"}
              action={() => router.push("/premium")}
            />
          </>
        )}
      </Section>
      <Section title="PRIVACIDADE E SEGURANÇA">
        <Action
          secondary
          label="Política de Privacidade"
          action={() =>
            void Linking.openURL(LEGAL_URLS.privacyPolicy).catch(() =>
              setSessionError("Não foi possível abrir este documento agora."),
            )
          }
        />

        <Action
          secondary
          label="Termos de Serviço"
          action={() =>
            void Linking.openURL(LEGAL_URLS.termsOfService).catch(() =>
              setSessionError("Não foi possível abrir este documento agora."),
            )
          }
        />
      </Section>
      <Section title="SESSÃO">
        <Text style={s.help}>
          <LocalizedCopy copyKey="legacy.96d53984b909" />
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() =>
            Alert.alert("Sair da conta", "Deseja sair desta conta?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair", style: "destructive", onPress: () => void signOut() },
            ])
          }
          style={s.logout}
        >
          <Text style={s.logoutText}>
            <LocalizedCopy copyKey="legacy.c7db4037eac6" />
          </Text>
        </Pressable>
        {sessionError ? <Feedback error text={sessionError} /> : null}
      </Section>
      <NativeFormModal
        visible={profileOpen}
        title="Editar nome"
        placeholder="Seu nome completo"
        value={name}
        onChange={(v) => {
          setName(v);
          setProfileError(undefined);
        }}
        busy={busy}
        error={profileError}
        onClose={() => setProfileOpen(false)}
        onSave={() => void saveName()}
      />
    </ScrollView>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.heading}>{title}</Text>
      {children}
    </View>
  );
}
function Feedback({ text, error }: { text: string; error?: boolean }) {
  return (
    <Text accessibilityLiveRegion="polite" style={error ? s.error : s.success}>
      {text}
    </Text>
  );
}
function Retry({ text, action }: { text: string; action(): void }) {
  return (
    <View style={s.inline}>
      <Text style={s.error}>{text}</Text>
      <Action secondary label="Tentar novamente" action={action} />
    </View>
  );
}
function Action({
  label,
  action,
  disabled,
  secondary,
}: {
  label: string;
  action(): void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={action}
      style={[s.action, secondary && s.secondary, disabled && s.disabled]}
    >
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  page: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: { ...typography.title, color: colors.text },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...typography.eyebrow, color: colors.primaryBright },
  subheading: {
    ...typography.eyebrow,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  account: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  accountCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  name: { ...typography.heading, color: colors.text, flexShrink: 1 },
  email: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  badge: {
    ...typography.caption,
    alignSelf: "flex-start",
    color: colors.primaryBright,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  value: { ...typography.body, color: colors.text },
  help: { ...typography.body, color: colors.textMuted },
  success: { ...typography.body, color: colors.success },
  error: { ...typography.body, color: colors.danger },
  inline: { gap: spacing.sm },
  action: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.55 },
  actionText: { ...typography.label, color: colors.text, textAlign: "center" },
  logout: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { ...typography.label, color: colors.danger, textAlign: "center" },
});
