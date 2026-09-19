import { useCallback, useState, type ReactNode } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppScreen } from "@/components/app-screen";
import { NativeFormModal } from "@/components/native-form-modal";
import { ProfileAvatar } from "@/components/profile-avatar";
import { StandardHeader } from "@/components/product-ui";
import { useLogout } from "@/hooks/use-logout";
import { useProfile } from "@/hooks/use-profile";
import { useSubscription } from "@/hooks/use-subscription";
import { LEGAL_URLS } from "@/lib/legal";
import { queryKeys } from "@/lib/query-keys";
import {
  notificationCopyFor,
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
  type NotificationDeviceState,
} from "@/services/notification-service";
import { updateProfileName } from "@/services/profile-service";
import {
  listIntegrationReadiness,
  readGoogleWorkspace,
  type GoogleWorkspaceProvider,
} from "@/services/integration-status-service";
import { useLanguage } from "@/providers/language-provider";
import type { LanguagePreference } from "@/i18n";

const settingsCopy = {
  "pt-BR": {
    subtitle: "Conta, idioma, notificações, privacidade e estado do dispositivo.",
    account: "CONTA",
    accountLabel: "Conta KIVRYN",
    emailUnavailable: "email indisponível",
    planLower: "plano",
    loadingProfile: "Carregando perfil…",
    nameMissing: "Nome não informado",
    emailMissing: "Email indisponível",
    plan: "Plano",
    loading: "carregando…",
    profileLoadError: "Não foi possível carregar os dados do perfil.",
    profile: "PERFIL",
    profileHelp: "Seu nome é usado para personalizar sua experiência na KIVRYN.",
    editName: "Editar nome",
    nameUpdated: "Nome atualizado.",
    nameUpdateError: "Não foi possível atualizar o nome. Tente novamente.",
    notifications: "NOTIFICAÇÕES",
    notificationCheckError: "Não foi possível verificar as notificações.",
    permission: "Permissão do sistema",
    channel: "Canal KIVRYN",
    expoProject: "Projeto Expo/EAS",
    deviceRegistration: "Registro deste aparelho",
    remotePush: "Push remoto",
    ready: "Pronto",
    pending: "Pendente",
    configured: "Configurado",
    missing: "Ausente",
    confirmed: "Confirmado",
    prepared: "Preparado",
    localTest: "TESTE LOCAL",
    localTestHelp: "Agenda uma notificação local em poucos segundos. Isso valida permissão, canal e agendamento no aparelho, não o servidor remoto.",
    scheduleLocal: "Agendar teste local",
    remoteTest: "TESTE REMOTO",
    remoteTestHelp: "Solicita ao backend um push para este usuário. Aceite do provedor não é prova de entrega física.",
    requestRemote: "Solicitar teste remoto",
    disableDevice: "Desativar neste dispositivo",
    disableTitle: "Desativar neste dispositivo",
    disableBody: "A KIVRYN deixará de usar o registro deste aparelho. A permissão do Android poderá continuar ativa.",
    cancel: "Cancelar",
    disable: "Desativar",
    noticeUnavailable: "O estado das notificações ainda não está disponível.",
    settingsOpenError: "Não foi possível abrir as configurações do aparelho.",
    registered: "Registro confirmado neste dispositivo. A entrega será validada no teste físico.",
    permissionIncomplete: "A permissão não foi concluída neste dispositivo.",
    projectMissing: "O projeto Expo/EAS necessário para push remoto não foi encontrado.",
    channelError: "Não foi possível preparar o canal de notificações neste aparelho.",
    tokenError: "Não foi possível obter a identificação deste aparelho para push remoto.",
    registrationError: "Não foi possível confirmar o registro deste aparelho.",
    activationError: "Não foi possível ativar as notificações.",
    providerAccepted: "Envio aceito pelo provedor. A entrega física ainda precisa ser confirmada neste aparelho.",
    providerRejected: "O provedor não aceitou o teste remoto neste momento.",
    remoteRequestError: "Não foi possível solicitar o teste remoto neste momento.",
    localScheduled: "Teste local agendado. A entrega será confirmada no teste físico do app.",
    localScheduleError: "Não foi possível agendar o teste neste aparelho.",
    deviceDisabled: "Este dispositivo foi desativado. A permissão do Android permanece ativa.",
    deviceDisableError: "Não foi possível desativar este dispositivo. Tente novamente.",
    premium: "PREMIUM",
    checkingPlan: "Verificando seu plano…",
    planError: "Não foi possível verificar seu plano.",
    currentPlan: "Plano atual",
    premiumInfo: "A compra e o gerenciamento de novas assinaturas ficam para a próxima versão. Nesta versão, esta área é informativa.",
    premiumBenefits: "Ver benefícios do Premium",
    connections: "CONEXÕES",
    connectionsHelp: "Estado real das integrações externas. Credenciais permanecem somente no servidor.",
    connectionsError: "Não foi possível verificar as integrações.",
    workspaceRead: "Ler agora",
    workspaceReadSuccess: "Leitura concluída",
    workspaceReadError: "Não foi possível ler esta conexão.",
    readyToConnect: "Disponível para conectar",
    connected: "Conectado",
    comingSoon: "Em breve",
    configRequired: "Configuração necessária",
    reviewRequired: "Revisão do provider necessária",
    creatorAvailable: "Disponível no Creator",
    manageCreator: "Gerenciar no Creator",
    openCreator: "Abrir Creator",
    integrationApproval: "Leituras exigem escopos concedidos. Ações externas continuam exigindo aprovação explícita.",
    privacy: "PRIVACIDADE E SEGURANÇA",
    privacyPolicy: "Política de Privacidade",
    terms: "Termos de Serviço",
    documentOpenError: "Não foi possível abrir este documento agora.",
    session: "SESSÃO",
    sessionHelp: "Encerre sua sessão neste dispositivo com segurança.",
    logoutTitle: "Sair da conta",
    logoutBody: "Deseja sair desta conta?",
    logout: "Sair",
    logoutError: "Não foi possível sair. Verifique sua conexão e tente novamente.",
    fullName: "Seu nome completo",
    retry: "Tentar novamente",
  },
  en: {
    subtitle: "Account, language, notifications, privacy and device status.",
    account: "ACCOUNT",
    accountLabel: "KIVRYN account",
    emailUnavailable: "email unavailable",
    planLower: "plan",
    loadingProfile: "Loading profile…",
    nameMissing: "Name not provided",
    emailMissing: "Email unavailable",
    plan: "Plan",
    loading: "loading…",
    profileLoadError: "We couldn't load your profile data.",
    profile: "PROFILE",
    profileHelp: "Your name is used to personalize your KIVRYN experience.",
    editName: "Edit name",
    nameUpdated: "Name updated.",
    nameUpdateError: "We couldn't update your name. Please try again.",
    notifications: "NOTIFICATIONS",
    notificationCheckError: "We couldn't check notifications.",
    permission: "System permission",
    channel: "KIVRYN channel",
    expoProject: "Expo/EAS project",
    deviceRegistration: "This device registration",
    remotePush: "Remote push",
    ready: "Ready",
    pending: "Pending",
    configured: "Configured",
    missing: "Missing",
    confirmed: "Confirmed",
    prepared: "Ready",
    localTest: "LOCAL TEST",
    localTestHelp: "Schedules a local notification in a few seconds. This validates permission, channel and device scheduling, not the remote server.",
    scheduleLocal: "Schedule local test",
    remoteTest: "REMOTE TEST",
    remoteTestHelp: "Asks the backend to send a push to this user. Provider acceptance is not proof of physical delivery.",
    requestRemote: "Request remote test",
    disableDevice: "Disable on this device",
    disableTitle: "Disable on this device",
    disableBody: "KIVRYN will stop using this device registration. Android notification permission may remain enabled.",
    cancel: "Cancel",
    disable: "Disable",
    noticeUnavailable: "Notification status is not available yet.",
    settingsOpenError: "We couldn't open the device settings.",
    registered: "Registration confirmed on this device. Delivery will be validated during the physical test.",
    permissionIncomplete: "Permission was not completed on this device.",
    projectMissing: "The Expo/EAS project required for remote push was not found.",
    channelError: "We couldn't prepare the notification channel on this device.",
    tokenError: "We couldn't obtain this device identifier for remote push.",
    registrationError: "We couldn't confirm this device registration.",
    activationError: "We couldn't enable notifications.",
    providerAccepted: "The provider accepted the send request. Physical delivery still needs to be confirmed on this device.",
    providerRejected: "The provider did not accept the remote test right now.",
    remoteRequestError: "We couldn't request the remote test right now.",
    localScheduled: "Local test scheduled. Delivery will be confirmed during the physical app test.",
    localScheduleError: "We couldn't schedule the test on this device.",
    deviceDisabled: "This device was disabled. Android notification permission remains enabled.",
    deviceDisableError: "We couldn't disable this device. Please try again.",
    premium: "PREMIUM",
    checkingPlan: "Checking your plan…",
    planError: "We couldn't check your plan.",
    currentPlan: "Current plan",
    premiumInfo: "Purchasing and managing new subscriptions will be enabled in the next Android version. In this version, this area is informational.",
    premiumBenefits: "View Premium benefits",
    connections: "CONNECTIONS",
    connectionsHelp: "Real external integration status. Credentials stay server-side only.",
    connectionsError: "We couldn't check integrations.",
    workspaceRead: "Read now",
    workspaceReadSuccess: "Read completed",
    workspaceReadError: "Couldn't read this connection.",
    readyToConnect: "Ready to connect",
    connected: "Connected",
    comingSoon: "Coming Soon",
    configRequired: "Configuration required",
    reviewRequired: "Provider review required",
    creatorAvailable: "Available in Creator",
    manageCreator: "Manage in Creator",
    openCreator: "Open Creator",
    integrationApproval: "Reads require granted scopes. External mutations still require explicit approval.",
    privacy: "PRIVACY & SECURITY",
    privacyPolicy: "Privacy Policy",
    terms: "Terms of Service",
    documentOpenError: "We couldn't open this document right now.",
    session: "SESSION",
    sessionHelp: "Safely end your session on this device.",
    logoutTitle: "Sign out",
    logoutBody: "Do you want to sign out of this account?",
    logout: "Sign out",
    logoutError: "We couldn't sign you out. Check your connection and try again.",
    fullName: "Your full name",
    retry: "Try again",
  },
} as const;

// NXR-033 invariant: local notification test never claims remote delivery.
export default function Settings() {
  const { languagePreference, setLanguagePreference, resolvedLocale, t } = useLanguage();
  const text = settingsCopy[resolvedLocale];
  const { session } = useAuth();
  const profile = useProfile();
  const subscription = useSubscription();
  const integrations = useQuery({
    queryKey: ["integration-readiness"],
    queryFn: listIntegrationReadiness,
    staleTime: 60_000,
  });
  const logout = useLogout();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(""),
    [profileMessage, setProfileMessage] = useState<string>(),
    [profileError, setProfileError] = useState<string>();
  const [noticeState, setNoticeState] = useState<NotificationReadiness>(),
    [noticeDetails, setNoticeDetails] = useState<NotificationDeviceState>(),
    [noticeMessage, setNoticeMessage] = useState<string>(),
    [noticeError, setNoticeError] = useState(false),
    [sessionError, setSessionError] = useState<string>(),
    [workspaceMessage, setWorkspaceMessage] = useState<string>();

  const refreshNotifications = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const state = await getNotificationDeviceState(session.user.id);
      setNoticeDetails(state);
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
      setNoticeDetails(undefined);
      setNoticeError(true);
    }
  }, [session?.user.id]);

  const refetchProfile = profile.refetch;
  const refetchSubscription = subscription.refetch;
  const refetchIntegrations = integrations.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
      void refetchProfile();
      void refetchSubscription();
      void refetchIntegrations();
    }, [refreshNotifications, refetchProfile, refetchSubscription, refetchIntegrations]),
  );

  async function refresh() {
    setRefreshing(true);
    await Promise.allSettled([
      refreshNotifications(),
      profile.refetch(),
      subscription.refetch(),
      integrations.refetch(),
    ]);
    setRefreshing(false);
  }

  async function readWorkspace(provider: GoogleWorkspaceProvider) {
    if (busy) return;
    setBusy(true);
    setWorkspaceMessage(undefined);
    try {
      const items = await readGoogleWorkspace(provider, 5);
      setWorkspaceMessage(`${text.workspaceReadSuccess}: ${items.length}`);
      await integrations.refetch();
    } catch {
      setWorkspaceMessage(text.workspaceReadError);
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    if (!session || busy) return;
    const error = validateProfileName(name, resolvedLocale);
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
      setProfileMessage(text.nameUpdated);
    } catch {
      setProfileError(text.nameUpdateError);
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
        setNoticeMessage(text.settingsOpenError);
      }
      return;
    }
    setBusy(true);
    try {
      const result = await registerNativeNotifications(session.user.id);
      await refreshNotifications();
      setNoticeMessage(result.registered ? text.registered : text.permissionIncomplete);
    } catch (error) {
      await refreshNotifications().catch(() => undefined);
      const category = error instanceof Error ? error.message : "unexpected";
      setNoticeMessage(
        category === "project-config"
          ? text.projectMissing
          : category === "channel"
            ? text.channelError
            : category === "token"
              ? text.tokenError
              : category === "registration"
                ? text.registrationError
                : text.activationError,
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
        testPushSucceeded(await sendTestNotification()) ? text.providerAccepted : text.providerRejected,
      );
    } catch {
      setNoticeMessage(text.remoteRequestError);
    } finally {
      setBusy(false);
    }
  }

  async function testLocalNotice() {
    if (
      busy ||
      (noticeState !== "active" &&
        noticeState !== "needs-registration" &&
        noticeState !== "project-config")
    )
      return;
    setBusy(true);
    try {
      await scheduleLocalNotificationTest();
      setNoticeMessage(text.localScheduled);
    } catch {
      setNoticeMessage(text.localScheduleError);
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
      setNoticeMessage(text.deviceDisabled);
    } catch {
      setNoticeMessage(text.deviceDisableError);
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
      setSessionError(text.logoutError);
      setBusy(false);
    }
  }

  const plan = subscriptionPlanLabel(subscription.data?.entitlement, resolvedLocale);
  const noticeCopy = notificationCopyFor(resolvedLocale);
  const notice = noticeState ? noticeCopy[noticeState] : null;

  return (
    <AppScreen padded={false}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primaryBright}
          />
        }
        contentContainerStyle={s.page}
        showsVerticalScrollIndicator={false}
      >
        <StandardHeader title={t("settings.title")} subtitle={text.subtitle} />

        <Section title={t("settings.language").toUpperCase()}>
          <Text style={s.help}>{t("settings.languageHelp")}</Text>
          {(["system", "pt-BR", "en"] as LanguagePreference[]).map((value) => (
            <Action
              key={value}
              label={`${languagePreference === value ? "✓ " : ""}${t(`language.${value}` as "language.system" | "language.pt-BR" | "language.en")}`}
              action={() => void setLanguagePreference(value)}
            />
          ))}
        </Section>

        <Section title={text.account}>
          <View
            style={s.account}
            accessible
            accessibilityLabel={`${profile.data?.displayName ?? text.accountLabel}, ${session?.user.email ?? text.emailUnavailable}, ${text.planLower} ${plan}`}
          >
            <ProfileAvatar
              imageUrl={profile.data?.avatarUrl}
              name={profile.data?.displayName}
              email={session?.user.email}
              size={60}
            />
            <View style={s.accountCopy}>
              <Text style={s.name}>
                {profile.isPending ? text.loadingProfile : (profile.data?.fullName ?? text.nameMissing)}
              </Text>
              <Text style={s.email}>{session?.user.email ?? text.emailMissing}</Text>
              {subscription.isError ? (
                <Text style={s.error}>{text.planError}</Text>
              ) : (
                <Text style={s.badge}>
                  {text.plan} {subscription.isPending ? text.loading : plan}
                </Text>
              )}
            </View>
          </View>
          {profile.isError ? (
            <Retry text={text.profileLoadError} action={() => void profile.refetch()} retryLabel={text.retry} />
          ) : null}
        </Section>

        <Section title={text.profile}>
          <Text style={s.help}>{text.profileHelp}</Text>
          <Action
            label={text.editName}
            disabled={busy || profile.isError}
            action={() => {
              setName(profile.data?.fullName ?? "");
              setProfileError(undefined);
              setProfileOpen(true);
            }}
          />
          {profileMessage ? <Feedback text={profileMessage} /> : null}
        </Section>

        <Section title={text.notifications}>
          {noticeError ? (
            <Retry
              text={text.notificationCheckError}
              action={() => void refreshNotifications()}
              retryLabel={text.retry}
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

              {noticeDetails ? (
                <View style={s.diagnostics}>
                  <DiagnosticRow
                    label={text.permission}
                    value={permissionLabel(noticeDetails.permission, resolvedLocale)}
                    ready={noticeDetails.permission === "granted"}
                  />
                  <DiagnosticRow
                    label={text.channel}
                    value={noticeDetails.channelReady ? text.ready : text.pending}
                    ready={noticeDetails.channelReady}
                  />
                  <DiagnosticRow
                    label={text.expoProject}
                    value={noticeDetails.projectConfigAvailable ? text.configured : text.missing}
                    ready={noticeDetails.projectConfigAvailable}
                  />
                  <DiagnosticRow
                    label={text.deviceRegistration}
                    value={noticeDetails.deviceRegistered ? text.confirmed : text.pending}
                    ready={noticeDetails.deviceRegistered}
                  />
                  <DiagnosticRow
                    label={text.remotePush}
                    value={noticeDetails.remotePushReady ? text.prepared : text.pending}
                    ready={noticeDetails.remotePushReady}
                  />
                </View>
              ) : null}

              {notice.action ? (
                <Action label={notice.action} disabled={busy} action={() => void enable()} />
              ) : null}

              {noticeState === "active" ||
              noticeState === "needs-registration" ||
              noticeState === "project-config" ? (
                <>
                  <Text style={s.subheading}>{text.localTest}</Text>
                  <Text style={s.help}>{text.localTestHelp}</Text>
                  <Action
                    secondary
                    label={text.scheduleLocal}
                    disabled={busy}
                    action={() => void testLocalNotice()}
                  />

                  {noticeState === "active" ? (
                    <>
                      <Text style={s.subheading}>{text.remoteTest}</Text>
                      <Text style={s.help}>{text.remoteTestHelp}</Text>
                      <Action
                        secondary
                        label={text.requestRemote}
                        disabled={busy}
                        action={() => void testNotice()}
                      />
                      <Action
                        secondary
                        label={text.disableDevice}
                        disabled={busy}
                        action={() =>
                          Alert.alert(text.disableTitle, text.disableBody, [
                            { text: text.cancel, style: "cancel" },
                            {
                              text: text.disable,
                              style: "destructive",
                              onPress: () => void disableDevice(),
                            },
                          ])
                        }
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <Text style={s.help}>{text.noticeUnavailable}</Text>
          )}
          {noticeMessage ? <Feedback text={noticeMessage} /> : null}
        </Section>

        <Section title={text.premium}>
          {subscription.isPending ? (
            <Text style={s.help}>{text.checkingPlan}</Text>
          ) : subscription.isError ? (
            <Retry
              text={text.planError}
              action={() => void subscription.refetch()}
              retryLabel={text.retry}
            />
          ) : (
            <>
              <Text style={s.value}>
                {text.currentPlan}: {plan}
              </Text>
              <Text style={s.help}>{text.premiumInfo}</Text>
              <Action label={text.premiumBenefits} action={() => router.push("/premium")} />
            </>
          )}
        </Section>

        <Section title={text.connections}>
          <Text style={s.help}>{text.connectionsHelp}</Text>
          {integrations.isPending ? (
            <Text style={s.help}>{text.loading}</Text>
          ) : integrations.isError ? (
            <Retry
              text={text.connectionsError}
              action={() => void integrations.refetch()}
              retryLabel={text.retry}
            />
          ) : (
            <View style={s.diagnostics}>
              {(integrations.data ?? []).map((provider) => {
                const label =
                  provider.provider === "google_calendar"
                    ? "Google Calendar"
                    : provider.provider === "google_drive"
                      ? "Google Drive"
                      : provider.provider === "youtube"
                        ? "YouTube"
                        : provider.provider === "tiktok"
                          ? "TikTok"
                          : provider.provider === "gmail"
                            ? "Gmail"
                            : provider.provider === "whatsapp"
                              ? "WhatsApp"
                              : provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1);
                const connected = provider.connectionState === "connected";
                const state =
                  provider.connectionState === "needs_permission"
                    ? resolvedLocale === "en"
                      ? "Needs permission"
                      : "Precisa de permissão"
                    : provider.connectionState === "expired"
                      ? resolvedLocale === "en"
                        ? "Expired"
                        : "Expirado"
                      : provider.connectionState === "error"
                        ? resolvedLocale === "en"
                          ? "Connection error"
                          : "Erro de conexão"
                        : provider.connectionState === "disconnected"
                          ? resolvedLocale === "en"
                            ? "Disconnected"
                            : "Desconectado"
                          : connected
                            ? text.connected
                            : provider.readiness === "coming_soon"
                              ? text.comingSoon
                              : !provider.runtimeConfigured
                                ? text.configRequired
                                : provider.readiness === "app_review_required"
                                  ? text.reviewRequired
                                  : provider.provider === "gmail" ||
                                      provider.provider === "google_calendar" ||
                                      provider.provider === "google_drive"
                                    ? text.readyToConnect
                                    : text.creatorAvailable;
                return (
                  <View key={provider.provider} style={s.integrationRow}>
                    <View style={s.flex}>
                      <Text style={s.value}>{label}</Text>
                      <Text style={s.help}>{state}</Text>
                      {provider.displayName ? <Text style={s.help}>{provider.displayName}</Text> : null}
                      {provider.lastSuccessAt ? (
                        <Text style={s.help}>
                          {resolvedLocale === "en" ? "Last sync" : "Última sincronização"}:{" "}
                          {new Date(provider.lastSuccessAt).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[s.statusDot, connected ? s.statusReady : s.statusPending]} />
                  </View>
                );
              })}
            </View>
          )}
          {(integrations.data ?? [])
            .filter(
              (provider) =>
                provider.connectionState === "connected" &&
                (provider.provider === "gmail" ||
                  provider.provider === "google_calendar" ||
                  provider.provider === "google_drive"),
            )
            .map((provider) => (
              <Action
                key={`workspace-read-${provider.provider}`}
                secondary
                disabled={busy}
                label={`${text.workspaceRead} · ${
                  provider.provider === "google_calendar"
                    ? "Google Calendar"
                    : provider.provider === "google_drive"
                      ? "Google Drive"
                      : "Gmail"
                }`}
                action={() => void readWorkspace(provider.provider as GoogleWorkspaceProvider)}
              />
            ))}
          {workspaceMessage ? (
            <Feedback text={workspaceMessage} error={workspaceMessage === text.workspaceReadError} />
          ) : null}
          <Text style={s.help}>{text.integrationApproval}</Text>
          {(integrations.data ?? []).some(
            (provider) =>
              provider.implemented &&
              provider.canConnect &&
              (provider.provider === "youtube" || provider.provider === "tiktok"),
          ) ? (
            <Action
              secondary
              label={text.openCreator}
              action={() => router.push("/creator")}
            />
          ) : null}
        </Section>

        <Section title={text.privacy}>
          <Action
            secondary
            label={text.privacyPolicy}
            action={() =>
              void Linking.openURL(LEGAL_URLS.privacyPolicy).catch(() =>
                setSessionError(text.documentOpenError),
              )
            }
          />
          <Action
            secondary
            label={text.terms}
            action={() =>
              void Linking.openURL(LEGAL_URLS.termsOfService).catch(() =>
                setSessionError(text.documentOpenError),
              )
            }
          />
        </Section>

        <Section title={text.session}>
          <Text style={s.help}>{text.sessionHelp}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() =>
              Alert.alert(text.logoutTitle, text.logoutBody, [
                { text: text.cancel, style: "cancel" },
                { text: text.logout, style: "destructive", onPress: () => void signOut() },
              ])
            }
            style={s.logout}
          >
            <Text style={s.logoutText}>{text.logout}</Text>
          </Pressable>
          {sessionError ? <Feedback error text={sessionError} /> : null}
        </Section>
      </ScrollView>

      <NativeFormModal
        visible={profileOpen}
        title={text.editName}
        placeholder={text.fullName}
        value={name}
        onChange={(value) => {
          setName(value);
          setProfileError(undefined);
        }}
        busy={busy}
        error={profileError}
        onClose={() => setProfileOpen(false)}
        onSave={() => void saveName()}
      />
    </AppScreen>
  );
}

function permissionLabel(
  permission: NotificationDeviceState["permission"],
  locale: "pt-BR" | "en",
) {
  const en = locale === "en";
  if (permission === "granted") return en ? "Granted" : "Concedida";
  if (permission === "blocked") return en ? "Blocked" : "Bloqueada";
  if (permission === "denied") return en ? "Denied" : "Negada";
  if (permission === "undetermined") return en ? "Not requested" : "Não solicitada";
  return en ? "Unsupported" : "Sem suporte";
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.heading}>{title}</Text>
      {children}
    </View>
  );
}

function DiagnosticRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <View style={s.diagnosticRow}>
      <View style={[s.statusDot, ready ? s.statusReady : s.statusPending]} />
      <Text style={s.diagnosticLabel}>{label}</Text>
      <Text style={[s.diagnosticValue, ready && s.diagnosticValueReady]}>{value}</Text>
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

function Retry({
  text,
  action,
  retryLabel,
}: {
  text: string;
  action(): void;
  retryLabel: string;
}) {
  return (
    <View style={s.inline}>
      <Text style={s.error}>{text}</Text>
      <Action secondary label={retryLabel} action={action} />
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
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
      ]}
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
  diagnostics: {
    overflow: "hidden",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  diagnosticRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusReady: { backgroundColor: colors.success },
  statusPending: { backgroundColor: colors.textMuted },
  diagnosticLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  diagnosticValue: { ...typography.caption, color: colors.textMuted },
  diagnosticValueReady: { color: colors.success },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1, gap: 2 },
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
  pressed: { opacity: 0.72 },
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