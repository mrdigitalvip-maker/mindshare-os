import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
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
  creatorEvidenceIntelligence,
  parseOptionalMetric,
  type CreatorContentLog,
  type CreatorAnalyticsSnapshot,
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
  listCreatorAnalytics,
  listCreatorConnections,
  saveCreatorContent,
  syncCreatorAnalytics,
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
export default function Analytics() {
  const { session } = useAuth(),
    { t, resolvedLocale } = useLanguage();
  const [content, setContent] = useState<CreatorContentLog[]>([]),
    [snapshots, setSnapshots] = useState<CreatorManualSnapshot[]>([]),
    [providerAnalytics, setProviderAnalytics] = useState<CreatorAnalyticsSnapshot[]>([]);
  const [form, setForm] = useState(blank()),
    [metrics, setMetrics] = useState<Record<string, string>>({}),
    [editing, setEditing] = useState<string>();
  const [connectedCount, setConnectedCount] = useState(0);
  const [connections, setConnections] = useState<CreatorPlatformConnection[]>([]);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string>();
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const [items, history, verifiedAnalytics, connections] = await Promise.all([
      listCreatorContent(session.user.id),
      listCreatorManualSnapshots(session.user.id),
      listCreatorAnalytics(session.user.id),
      listCreatorConnections(session.user.id),
    ]);
    setContent(items);
    setSnapshots(history);
    setProviderAnalytics(verifiedAnalytics);
    setConnections(connections);
    setConnectedCount(connections.filter((x) => x.status === "connected").length);
  }, [session?.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const syncConnection = async (connection: CreatorPlatformConnection) => {
    if (connection.platform !== "youtube" && connection.platform !== "tiktok") return;
    setSyncingConnectionId(connection.id);
    try {
      const result = (await syncCreatorAnalytics({
        connectionId: connection.id,
        provider: connection.platform,
      })) as { synced?: number; content?: number; snapshots?: number };
      await load();
      Alert.alert(
        resolvedLocale === "en" ? "Sync completed" : "Sincronização concluída",
        resolvedLocale === "en"
          ? `${result.content ?? 0} content item(s), ${result.snapshots ?? 0} new snapshot(s).`
          : `${result.content ?? 0} conteúdo(s), ${result.snapshots ?? 0} novo(s) snapshot(s).`,
      );
    } catch {
      await load();
      Alert.alert(
        resolvedLocale === "en" ? "Sync failed" : "Falha na sincronização",
        resolvedLocale === "en"
          ? "Check the connection state and permissions."
          : "Verifique o estado da conexão e as permissões.",
      );
    } finally {
      setSyncingConnectionId(undefined);
    }
  };

  const connectionStatus = (value: CreatorPlatformConnection["status"]) => {
    const labels = resolvedLocale === "en"
      ? {
          not_connected: "Not connected",
          authorizing: "Authorizing",
          connected: "Connected",
          needs_permission: "Needs permission",
          expired: "Expired",
          revoked: "Revoked",
          error: "Error",
        }
      : {
          not_connected: "Não conectado",
          authorizing: "Autorizando",
          connected: "Conectado",
          needs_permission: "Precisa de permissão",
          expired: "Expirado",
          revoked: "Revogado",
          error: "Erro",
        };
    return labels[value];
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
  const analysis = creatorEvidenceIntelligence({
    content,
    manualSnapshots: snapshots,
    providerAnalytics,
  });
  const knownViews = analysis.observations.reduce((sum, row) => sum + row.value, 0);
  const evidenceLabel =
    analysis.source === "provider_verified"
      ? resolvedLocale === "en"
        ? "Provider verified"
        : "Verificado pelo provedor"
      : resolvedLocale === "en"
        ? "Manual"
        : "Manual";
  const confidenceLabel =
    resolvedLocale === "en"
      ? analysis.confidence
      : analysis.confidence === "high"
        ? "alta"
        : analysis.confidence === "medium"
          ? "média"
          : analysis.confidence === "low"
            ? "baixa"
            : "insuficiente";
  return (
    <CreatorPage title={t("creator.analytics")} description={t("creator.standaloneHelp")}>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.connectedOptional")}</Text>
        <Text style={s.copy}>{t("creator.connectLater")}</Text>
        <Text style={s.copy}>{t("creator.connectedCount", { count: connectedCount })}</Text>
        {connections
          .filter((connection) => connection.platform === "youtube" || connection.platform === "tiktok")
          .map((connection) => (
            <View key={connection.id} style={{ marginTop: 12, gap: 6 }}>
              <Text style={s.heading}>
                {connection.platform === "youtube" ? "YouTube" : "TikTok"} · {connectionStatus(connection.status)}
              </Text>
              {connection.displayName ? <Text style={s.copy}>{connection.displayName}</Text> : null}
              {connection.platform === "youtube" && connection.lastSuccessAt ? (
                <Text style={s.copy}>
                  {resolvedLocale === "en" ? "Last sync" : "Última sincronização"}:{" "}
                  {new Date(connection.lastSuccessAt).toLocaleString()}
                </Text>
              ) : null}
              {connection.safeErrorCode ? (
                <Text style={s.copy}>
                  {resolvedLocale === "en" ? "State" : "Estado"}: {connection.safeErrorCode.replaceAll("_", " ")}
                </Text>
              ) : null}
              {connection.status === "connected" ? (
                <CreatorButton
                  label={
                    syncingConnectionId === connection.id
                      ? resolvedLocale === "en"
                        ? "Syncing…"
                        : "Sincronizando…"
                      : resolvedLocale === "en"
                        ? "Sync analytics"
                        : "Sincronizar analytics"
                  }
                  onPress={() => void syncConnection(connection)}
                  disabled={Boolean(syncingConnectionId)}
                />
              ) : null}
            </View>
          ))}
        {!connections.some((connection) => connection.platform === "youtube") ? (
          <Text style={s.copy}>
            {resolvedLocale === "en"
              ? "YouTube connection is completed on KIVRYN Web in this Web-first phase."
              : "A conexão do YouTube é concluída no KIVRYN Web nesta fase Web-first."}
          </Text>
        ) : null}
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
          {resolvedLocale === "en"
            ? `Evidence: ${evidenceLabel} · sample ${analysis.sampleCount} · confidence ${confidenceLabel}`
            : `Evidência: ${evidenceLabel} · amostra ${analysis.sampleCount} · confiança ${confidenceLabel}`}
        </Text>
        <Text style={s.copy}>
          {resolvedLocale === "en"
            ? `Provider sample: ${analysis.providerSampleCount} · manual sample: ${analysis.manualSampleCount}`
            : `Amostra do provedor: ${analysis.providerSampleCount} · amostra manual: ${analysis.manualSampleCount}`}
        </Text>
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
