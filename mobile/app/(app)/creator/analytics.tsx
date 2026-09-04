import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Linking from "expo-linking";
import { CreatorButton, CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import {
  CREATOR_PROVIDER_CAPABILITIES,
  presentCreatorMetrics,
  type CreatorAnalyticsSnapshot,
  type CreatorPlatformConnection,
} from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  disconnectCreatorConnection,
  listCreatorAnalytics,
  listCreatorConnections,
  startCreatorOAuth,
  syncCreatorAnalytics,
} from "@/services/creator-service";
const platforms = ["youtube", "tiktok", "instagram"] as const;
export default function Analytics() {
  const { session } = useAuth(),
    { t } = useLanguage();
  const [data, setData] = useState<CreatorAnalyticsSnapshot[]>([]),
    [connections, setConnections] = useState<CreatorPlatformConnection[]>([]);
  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const [snapshots, linked] = await Promise.all([
      listCreatorAnalytics(session.user.id),
      listCreatorConnections(session.user.id),
    ]);
    setData(snapshots);
    setConnections(linked);
  }, [session?.user.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const connect = async (platform: (typeof platforms)[number]) => {
    const result = await startCreatorOAuth(platform, Linking.createURL("creator/analytics"));
    await Linking.openURL(result.authorizationUrl);
    await load();
  };
  const refresh = async () => {
    await syncCreatorAnalytics();
    await load();
  };
  return (
    <CreatorPage title={t("creator.analytics")} description={t("creator.privacy")}>
      <Text style={s.heading}>{t("creator.connectedAccounts")}</Text>
      {platforms.map((platform) => {
        const connection = connections.find((x) => x.platform === platform);
        const capability = CREATOR_PROVIDER_CAPABILITIES[platform];
        return (
          <View style={s.card} key={platform}>
            <Text style={s.heading}>
              {platform === "youtube" ? "YouTube" : platform === "tiktok" ? "TikTok" : "Instagram"}
            </Text>
            <Text style={s.copy}>
              {connection?.status ?? "not_connected"} · {capability.readiness}
            </Text>
            {connection?.lastSuccessAt ? (
              <Text style={s.copy}>
                {t("creator.lastSync", {
                  date: new Date(connection.lastSuccessAt).toLocaleString(),
                })}
              </Text>
            ) : (
              <Text style={s.copy}>{t("creator.neverSynced")}</Text>
            )}
            {connection?.grantedMetrics.length ? (
              <Text style={s.copy}>
                {t("creator.availableMetrics", { metrics: connection.grantedMetrics.join(", ") })}
              </Text>
            ) : null}
            {platform === "instagram" ? (
              <Text style={s.copy}>{t("creator.instagramRequirement")}</Text>
            ) : connection?.status === "connected" ? (
              <>
                <CreatorButton label={t("creator.refreshData")} onPress={() => void refresh()} />
                <CreatorButton
                  danger
                  label={t("creator.disconnect")}
                  onPress={() => void disconnectCreatorConnection(connection.id).then(load)}
                />
              </>
            ) : (
              <CreatorButton
                label={t(connection ? "creator.reconnect" : "creator.connect")}
                onPress={() => void connect(platform)}
              />
            )}
          </View>
        );
      })}
      <Text style={s.copy}>{t("creator.historyRetention")}</Text>
      <Text style={s.heading}>{t("creator.yourPerformance")}</Text>
      <Text style={s.copy}>
        {t("creator.contentAnalyzed", {
          count: new Set(data.map((x) => x.providerContentId).filter(Boolean)).size,
        })}
      </Text>
      <Text style={s.copy}>{t("creator.realObservationsOnly")}</Text>
      {data.length === 0 ? (
        <Text style={s.copy}>{t("creator.noAnalytics")}</Text>
      ) : (
        data.map((x, i) => (
          <View style={s.card} key={`${x.capturedAt}-${x.providerContentId ?? i}`}>
            <Text style={s.heading}>
              {x.platform}
              {x.providerContentId ? ` · ${x.providerContentId}` : ""}
            </Text>
            <Text style={s.copy}>{new Date(x.publishedAt ?? x.capturedAt).toLocaleString()}</Text>
            {presentCreatorMetrics(x).map(([key, value]) => (
              <Text style={s.copy} key={key}>
                {t(`creator.metric.${key}`)}: {value}
              </Text>
            ))}
          </View>
        ))
      )}
    </CreatorPage>
  );
}
