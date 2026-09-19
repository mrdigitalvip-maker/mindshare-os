import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Text, View } from "react-native";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  ChoiceRow,
  creatorStyles as s,
} from "@/components/creator-workspace";
import {
  CREATOR_CONTENT_PLATFORMS,
  CREATOR_CONTENT_TYPES,
  CREATOR_MANUAL_METRICS,
  creatorHistoricalPerformance,
  parseOptionalMetric,
  type CreatorContentLog,
  type CreatorManualSnapshot,
  type CreatorPlatformConnection,
} from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  addCreatorMetricSnapshot,
  deleteCreatorContent,
  listCreatorContent,
  listCreatorManualSnapshots,
  listCreatorConnections,
  startCreatorOAuth,
  syncCreatorAnalytics,
  disconnectCreatorConnection,
  saveCreatorContent,
} from "@/services/creator-service";
type ContentForm = Omit<CreatorContentLog, "id" | "createdAt" | "updatedAt">;
const blank = (): ContentForm => ({
  platform: "instagram",
  contentType: "reel",
  title: "",
  publishedAt: new Date().toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  referenceUrl: "",
  contentPillar: "",
  durationMs: undefined,
  notes: "",
});
function connectionState(connection?: CreatorPlatformConnection) {
  if (!connection) return "not_connected";
  if (connection.safeErrorCode === "insufficient_scope") return "needs_permission";
  if (connection.status === "revoked") return "disconnected";
  return connection.status;
}

export default function Analytics() {
  const { session } = useAuth(),
    { t, resolvedLocale } = useLanguage();
  const copy = (pt: string, en: string) => (resolvedLocale === "en" ? en : pt);
  const [content, setContent] = useState<CreatorContentLog[]>([]),
    [snapshots, setSnapshots] = useState<CreatorManualSnapshot[]>([]);
  const [form, setForm] = useState(blank()),
    [metrics, setMetrics] = useState<Record<string, string>>({}),
    [editing, setEditing] = useState<string>();
  const [connectedCount, setConnectedCount] = useState(0);
  const [connections, setConnections] = useState<CreatorPlatformConnection[]>([]);
  const [providerBusy, setProviderBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const [items, history, connections] = await Promise.all([
      listCreatorContent(session.user.id),
      listCreatorManualSnapshots(session.user.id),
      listCreatorConnections(session.user.id),
    ]);
    setContent(items);
    setSnapshots(history);
    setConnections(connections);
    setConnectedCount(
      connections.filter((item) => connectionState(item) === "connected").length,
    );
  }, [session?.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const connectYouTube = async () => {
    setProviderBusy("youtube");
    try {
      const result = await startCreatorOAuth("youtube", "https://kivryn.co/creator");
      if (!result?.authorizationUrl) throw new Error("authorization_unavailable");
      await Linking.openURL(result.authorizationUrl);
      Alert.alert(
        copy("Autorização aberta", "Authorization opened"),
        copy(
          "Conclua a autorização no navegador. Depois volte ao KIVRYN e toque em Atualizar estado.",
          "Complete authorization in the browser. Then return to KIVRYN and tap Refresh status.",
        ),
      );
    } catch {
      Alert.alert(
        copy("Não foi possível conectar", "Couldn't connect"),
        copy(
          "A conexão do YouTube não pôde ser iniciada. Tente novamente pela Web ou revise a configuração OAuth.",
          "The YouTube connection couldn't be started. Retry on Web or review OAuth configuration.",
        ),
      );
    } finally {
      setProviderBusy(null);
    }
  };

  const syncYouTube = async (connectionId: string) => {
    setProviderBusy(connectionId);
    try {
      const result = await syncCreatorAnalytics(connectionId);
      await load();
      Alert.alert(
        copy("YouTube sincronizado", "YouTube synced"),
        copy(
          `${result.content ?? 0} vídeos e ${result.snapshots ?? 0} snapshots novos.`,
          `${result.content ?? 0} videos and ${result.snapshots ?? 0} new snapshots.`,
        ),
      );
    } catch {
      await load();
      Alert.alert(
        copy("Sincronização incompleta", "Sync incomplete"),
        copy(
          "Verifique as permissões da conexão e tente novamente.",
          "Check the connection permissions and retry.",
        ),
      );
    } finally {
      setProviderBusy(null);
    }
  };

  const disconnectYouTube = async (connectionId: string) => {
    setProviderBusy(connectionId);
    try {
      await disconnectCreatorConnection(connectionId);
      await load();
    } catch {
      Alert.alert(
        copy("Não foi possível desconectar", "Couldn't disconnect"),
        copy("Tente novamente.", "Please retry."),
      );
    } finally {
      setProviderBusy(null);
    }
  };

  const save = async () => {
    if (!session?.user.id || !form.title.trim()) return;
    const item = await saveCreatorContent(session.user.id, { ...form, id: editing });
    const parsed = Object.fromEntries(
      CREATOR_MANUAL_METRICS.map((key) => [key, parseOptionalMetric(metrics[key])]),
    );
    if (Object.values(parsed).some((x) => x !== null))
      await addCreatorMetricSnapshot(session.user.id, item, parsed);
    setForm(blank());
    setMetrics({});
    setEditing(undefined);
    await load();
  };
  const analysis = creatorHistoricalPerformance(content, snapshots);
  const knownViews = analysis.observations.reduce((sum, row) => sum + row.value, 0);
  return (
    <CreatorPage title={t("creator.analytics")} description={t("creator.standaloneHelp")}>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.connectedOptional")}</Text>
        <Text style={s.copy}>{t("creator.connectLater")}</Text>
        <Text style={s.copy}>{t("creator.connectedCount", { count: connectedCount })}</Text>
        {(() => {
          const youtube = connections.find((item) => item.platform === "youtube");
          const state = connectionState(youtube);
          const issue =
            youtube?.safeErrorCode === "insufficient_scope"
              ? copy("Precisa de permissão. Atualize a conexão.", "Needs permission. Update the connection.")
              : youtube?.safeErrorCode === "credential_expired"
                ? copy("Autorização expirada. Reconecte o canal.", "Authorization expired. Reconnect the channel.")
                : youtube?.safeErrorCode
                  ? copy("A conexão precisa de atenção.", "The connection needs attention.")
                  : null;
          return (
            <View style={s.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {youtube?.avatarUrl ? (
                  <Image
                    source={{ uri: youtube.avatarUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={s.heading}>YouTube</Text>
                  <Text style={s.copy}>
                    {youtube?.displayName
                      ? `${youtube.displayName} · ${state.replaceAll("_", " ")}`
                      : state.replaceAll("_", " ")}
                  </Text>
                  {youtube?.lastSuccessAt ? (
                    <Text style={s.copy}>
                      {copy("Última sincronização", "Last sync")}:{" "}
                      {new Date(youtube.lastSuccessAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              </View>
              {issue ? <Text style={s.copy}>{issue}</Text> : null}
              {state === "connected" && youtube ? (
                <>
                  <CreatorButton
                    label={copy("Sincronizar analytics", "Sync analytics")}
                    disabled={providerBusy !== null}
                    onPress={() => void syncYouTube(youtube.id)}
                  />
                  <CreatorButton
                    label={copy("Atualizar permissões", "Update permissions")}
                    disabled={providerBusy !== null}
                    onPress={() => void connectYouTube()}
                  />
                  <CreatorButton
                    label={copy("Desconectar", "Disconnect")}
                    disabled={providerBusy !== null}
                    onPress={() => void disconnectYouTube(youtube.id)}
                  />
                </>
              ) : (
                <CreatorButton
                  label={
                    youtube
                      ? copy("Reconectar / atualizar YouTube", "Reconnect / update YouTube")
                      : copy("Conectar YouTube", "Connect YouTube")
                  }
                  disabled={providerBusy !== null}
                  onPress={() => void connectYouTube()}
                />
              )}
              <CreatorButton
                label={copy("Atualizar estado", "Refresh status")}
                disabled={providerBusy !== null}
                onPress={() => void load()}
              />
            </View>
          );
        })()}
      </View>
      <Text style={s.heading}>{editing ? t("creator.editContent") : t("creator.addContent")}</Text>
      <ChoiceRow
        values={CREATOR_CONTENT_PLATFORMS.map((value) => ({
          value,
          label: t(`creator.platform.${value}`),
        }))}
        selected={form.platform}
        onSelect={(platform) =>
          setForm((x) => ({ ...x, platform: platform as CreatorContentLog["platform"] }))
        }
      />
      <ChoiceRow
        values={CREATOR_CONTENT_TYPES.map((value) => ({
          value,
          label: t(`creator.contentType.${value}`),
        }))}
        selected={form.contentType}
        onSelect={(contentType) =>
          setForm((x) => ({ ...x, contentType: contentType as CreatorContentLog["contentType"] }))
        }
      />
      <CreatorField
        label={t("creator.contentTitle")}
        value={form.title}
        onChangeText={(title) => setForm((x) => ({ ...x, title }))}
      />
      <CreatorField
        label={t("creator.publishedAt")}
        value={form.publishedAt}
        onChangeText={(publishedAt) => setForm((x) => ({ ...x, publishedAt }))}
      />
      <CreatorField
        label={t("creator.timezone")}
        value={form.timezone}
        onChangeText={(timezone) => setForm((x) => ({ ...x, timezone }))}
      />
      <CreatorField
        label={t("creator.referenceUrl")}
        value={form.referenceUrl ?? ""}
        onChangeText={(referenceUrl) => setForm((x) => ({ ...x, referenceUrl }))}
      />
      <CreatorField
        label={t("creator.contentPillar")}
        value={form.contentPillar ?? ""}
        onChangeText={(contentPillar) => setForm((x) => ({ ...x, contentPillar }))}
      />
      <Text style={s.heading}>{t("creator.metricsOptional")}</Text>
      {CREATOR_MANUAL_METRICS.map((key) => (
        <CreatorField
          key={key}
          keyboardType="numeric"
          label={t(`creator.metric.${key}`)}
          value={metrics[key] ?? ""}
          onChangeText={(value) => setMetrics((x) => ({ ...x, [key]: value }))}
        />
      ))}
      <CreatorButton
        label={t("common.save")}
        disabled={!form.title.trim()}
        onPress={() => void save()}
      />
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.yourPerformance")}</Text>
        <Text style={s.copy}>{t("creator.contentAnalyzed", { count: content.length })}</Text>
        <Text style={s.copy}>{t("creator.totalKnownViews", { count: knownViews })}</Text>
        <Text style={s.copy}>{t("creator.realObservationsOnly")}</Text>
        <Text style={s.copy}>
          {analysis.strongestPostingWindow
            ? t("creator.strongestWindow", {
                window: analysis.strongestPostingWindow.key,
                count: analysis.strongestPostingWindow.sampleCount,
              })
            : t("creator.notEnoughData")}
        </Text>
      </View>
      {content.map((item) => {
        const history = snapshots.filter((x) => x.contentId === item.id);
        return (
          <View style={s.card} key={item.id}>
            <Text style={s.heading}>{item.title}</Text>
            <Text style={s.copy}>
              {item.platform} · {new Date(item.publishedAt).toLocaleString()}
            </Text>
            <Text style={s.copy}>
              {t("creator.manualSource")} · {t("creator.snapshotCount", { count: history.length })}
            </Text>
            <CreatorButton
              label={t("common.edit")}
              onPress={() => {
                setEditing(item.id);
                setForm({ ...blank(), ...item });
                setMetrics({});
              }}
            />
            <CreatorButton
              label={t("creator.quickUpdate")}
              onPress={() => {
                setEditing(item.id);
                setForm({ ...blank(), ...item });
                setMetrics({});
              }}
            />
            <CreatorButton
              danger
              label={t("common.delete")}
              onPress={() =>
                Alert.alert(t("creator.deleteContent"), t("creator.deleteConfirm"), [
                  { text: t("common.cancel") },
                  {
                    text: t("common.delete"),
                    style: "destructive",
                    onPress: () =>
                      session?.user.id &&
                      void deleteCreatorContent(session.user.id, item.id).then(load),
                  },
                ])
              }
            />
          </View>
        );
      })}
    </CreatorPage>
  );
}
