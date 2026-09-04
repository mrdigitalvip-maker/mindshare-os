import { Text, View } from "react-native";
import { CreatorField, CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { useLanguage } from "@/providers/language-provider";
import { useState } from "react";
export default function CreatorMap() {
  const { t } = useLanguage();
  const [f, setF] = useState({ platform: "", country: "", contentType: "", niche: "" });
  return (
    <CreatorPage title={t("creator.map")}>
      {Object.keys(f).map((k) => (
        <CreatorField
          key={k}
          label={t(`creator.map.${k}`)}
          value={f[k as keyof typeof f]}
          onChangeText={(v) => setF((x) => ({ ...x, [k]: v }))}
        />
      ))}
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.globalBenchmark")}</Text>
        <Text style={s.copy}>{t("creator.noBenchmarkDataset")}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>{t("creator.yourAudience")}</Text>
        <Text style={s.copy}>{t("creator.connectAudience")}</Text>
      </View>
    </CreatorPage>
  );
}
