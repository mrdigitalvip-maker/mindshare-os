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
  creatorHistoricalPerformance,
  parseOptionalMetric,
  type CreatorContentLog,
  type CreatorManualSnapshot,
} from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  addCreatorMetricSnapshot,
  deleteCreatorContent,
  listCreatorContent,
  listCreatorManualSnapshots,
  listCreatorConnections,
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
export default function Analytics() {
  const { session } = useAuth(),
    { t } = useLanguage();
  const [content, setContent] = useState<CreatorContentLog[]>([]),
    [snapshots, setSnapshots] = useState<CreatorManualSnapshot[]>([]);
  const [form, setForm] = useState(blank()),
    [metrics, setMetrics] = useState<Record<string, string>>({}),
    [editing, setEditing] = useState<string>();
  const [connectedCount, setConnectedCount] = useState(0);
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const [items, history, connections] = await Promise.all([
      listCreatorContent(session.user.id),
      listCreatorManualSnapshots(session.user.id),
      listCreatorConnections(session.user.id),
    ]);
    setContent(items);
    setSnapshots(history);
    setConnectedCount(connections.filter((x) => x.status === "connected").length);
  }, [session?.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
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
