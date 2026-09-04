import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  ChoiceRow,
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import {
  CREATOR_CONTENT_PLATFORMS,
  type CreatorContentLog,
  type CreatorCountryObservation,
} from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCreatorManualCountries, saveCreatorManualCountry } from "@/services/creator-service";
import { listCreatorAnalytics } from "@/services/creator-service";
export default function CreatorMap() {
  const { t } = useLanguage(),
    { session } = useAuth();
  const [rows, setRows] = useState<CreatorCountryObservation[]>([]),
    [providerRows, setProviderRows] = useState<Awaited<ReturnType<typeof listCreatorAnalytics>>>(
      [],
    ),
    [form, setForm] = useState({
      platform: "instagram" as CreatorContentLog["platform"],
      countryIso: "",
      countryName: "",
      metricContext: "audience_percentage",
      value: "",
      period: "",
      notes: "",
    });
  const load = useCallback(
    () =>
      session?.user.id
        ? listCreatorManualCountries(session.user.id).then(setRows)
        : Promise.resolve(),
    [session?.user.id],
  );
  useEffect(() => {
    void load();
    if (session?.user.id) void listCreatorAnalytics(session.user.id).then(setProviderRows);
  }, [load, session?.user.id]);
  // Keep NXR-037D provider observations available alongside, never merged into, manual data.
  const countries = providerRows.filter((x) => x.country && typeof x.metrics.views === "number");
  const postingRows = providerRows.filter(
    (x) => typeof x.hour === "number" && typeof x.metrics.views === "number",
  );
  const save = async () => {
    if (!session?.user.id) return;
    await saveCreatorManualCountry(session.user.id, {
      ...form,
      countryIso: form.countryIso || undefined,
      value: Number(form.value),
    });
    setForm((x) => ({ ...x, countryIso: "", countryName: "", value: "", period: "", notes: "" }));
    await load();
  };
  return (
    <CreatorPage title={t("creator.map")} description={t("creator.mapManualHelp")}>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.globalBenchmark")}</Text>
        <Text style={s.copy}>{t("creator.noBenchmarkDataset")}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.yourPerformance")}</Text>
        <Text style={s.copy}>
          {postingRows.length >= 5 ? t("creator.realObservationsOnly") : t("creator.notEnoughData")}
        </Text>
        {countries.map((x, index) => (
          <Text key={`${x.country}-${index}`} style={s.copy}>
            {x.country}: {x.metrics.views}
          </Text>
        ))}
      </View>
      <Text style={s.heading}>{t("creator.addAudienceData")}</Text>
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
      <CreatorField
        label={t("creator.countryName")}
        value={form.countryName}
        onChangeText={(countryName) => setForm((x) => ({ ...x, countryName }))}
      />
      <CreatorField
        label={t("creator.countryIso")}
        value={form.countryIso}
        onChangeText={(countryIso) => setForm((x) => ({ ...x, countryIso }))}
      />
      <CreatorField
        label={t("creator.metricContext")}
        value={form.metricContext}
        onChangeText={(metricContext) => setForm((x) => ({ ...x, metricContext }))}
      />
      <CreatorField
        keyboardType="numeric"
        label={t("creator.value")}
        value={form.value}
        onChangeText={(value) => setForm((x) => ({ ...x, value }))}
      />
      <CreatorField
        label={t("creator.period")}
        value={form.period}
        onChangeText={(period) => setForm((x) => ({ ...x, period }))}
      />
      <CreatorButton
        label={t("common.save")}
        disabled={
          !form.countryName.trim() || !form.period.trim() || !Number.isFinite(Number(form.value))
        }
        onPress={() => void save()}
      />
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.yourAudience")}</Text>
        {rows.length ? (
          rows.map((x) => (
            <View key={x.id}>
              <Text style={s.copy}>
                {x.countryName}: {x.value} ({x.metricContext})
              </Text>
              <Text style={s.label}>{t("creator.manualAudienceSource")}</Text>
            </View>
          ))
        ) : (
          <Text style={s.copy}>{t("creator.addAudiencePrompt")}</Text>
        )}
      </View>
    </CreatorPage>
  );
}
