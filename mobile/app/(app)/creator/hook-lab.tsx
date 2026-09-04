import { useState } from "react";
import { Text } from "react-native";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import { useLanguage } from "@/providers/language-provider";
export default function HookLab() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ topic: "", platform: "", audience: "", goal: "", tone: "" });
  return (
    <CreatorPage title={t("creator.hookLab")} description={t("creator.hookUnavailable")}>
      {Object.keys(form).map((key) => (
        <CreatorField
          key={key}
          label={t(`creator.hook.${key}`)}
          value={form[key as keyof typeof form]}
          onChangeText={(value) => setForm((v) => ({ ...v, [key]: value }))}
        />
      ))}
      <CreatorButton label={t("creator.generate")} disabled onPress={() => undefined} />
      <Text style={s.copy}>{t("creator.notGenerated")}</Text>
    </CreatorPage>
  );
}
