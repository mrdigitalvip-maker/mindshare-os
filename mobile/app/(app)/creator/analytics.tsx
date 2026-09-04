import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { presentCreatorMetrics, type CreatorAnalyticsSnapshot } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCreatorAnalytics } from "@/services/creator-service";
export default function Analytics() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<CreatorAnalyticsSnapshot[]>([]);
  useEffect(() => {
    if (session?.user.id) void listCreatorAnalytics(session.user.id).then(setData);
  }, [session?.user.id]);
  return (
    <CreatorPage title={t("creator.analytics")}>
      {data.length === 0 ? (
        <Text style={s.copy}>{t("creator.noAnalytics")}</Text>
      ) : (
        data.map((x, i) => (
          <View style={s.card} key={`${x.capturedAt}-${i}`}>
            <Text style={s.heading}>{x.platform}</Text>
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
