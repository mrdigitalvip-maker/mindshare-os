import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { type CreatorAnalyticsSnapshot } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCreatorAnalytics } from "@/services/creator-service";
export default function CreatorMap() {
  const { t } = useLanguage(),
    { session } = useAuth(),
    [rows, setRows] = useState<CreatorAnalyticsSnapshot[]>([]);
  useEffect(() => {
    if (session?.user.id) void listCreatorAnalytics(session.user.id).then(setRows);
  }, [session?.user.id]);
  const countries = rows.filter((x) => x.country && typeof x.metrics.views === "number");
  const postingRows = rows.filter(
    (x) => typeof x.hour === "number" && typeof x.metrics.views === "number",
  );
  return (
    <CreatorPage title={t("creator.map")}>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.globalBenchmark")}</Text>
        <Text style={s.copy}>{t("creator.noBenchmarkDataset")}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>
          {countries.length ? t("creator.yourAudience") : t("creator.yourPerformance")}
        </Text>
        {countries.length ? (
          countries.map((x, i) => (
            <Text style={s.copy} key={`${x.country}-${i}`}>
              {x.country}: {x.metrics.views} {t("creator.metric.views")}
            </Text>
          ))
        ) : (
          <Text style={s.copy}>{t("creator.notEnoughData")}</Text>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.historicalPostingTime")}</Text>
        <Text style={s.copy}>
          {postingRows.length >= 5 ? t("creator.realObservationsOnly") : t("creator.notEnoughData")}
        </Text>
      </View>
    </CreatorPage>
  );
}
