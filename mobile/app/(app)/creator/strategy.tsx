import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  ChoiceRow,
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import { CREATOR_GOALS, CREATOR_PLATFORMS, type CreatorStrategy } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { loadCreatorStrategy, saveCreatorStrategy } from "@/services/creator-service";
const initial: CreatorStrategy = {
  platform: "instagram",
  niche: "",
  goal: "grow_followers",
  contentPillars: [],
  publishingFrequency: 1,
  targetMarkets: [],
  preferredContentFormats: [],
};
const split = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export default function Strategy() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (session?.user.id) void loadCreatorStrategy(session.user.id).then((v) => v && setF(v));
  }, [session?.user.id]);
  const p = (x: Partial<CreatorStrategy>) => {
    setSaved(false);
    setF((v) => ({ ...v, ...x }));
  };
  return (
    <CreatorPage title={t("creator.strategy")} description={t("creator.strategyHelp")}>
      <Text style={s.label}>{t("creator.platforms")}</Text>
      <ChoiceRow
        values={CREATOR_PLATFORMS.map((value) => ({ value, label: value }))}
        selected={f.platform}
        onSelect={(platform) => p({ platform: platform as CreatorStrategy["platform"] })}
      />
      <CreatorField
        label={t("creator.niche")}
        value={f.niche}
        onChangeText={(niche) => p({ niche })}
      />
      <Text style={s.label}>{t("creator.primaryGoal")}</Text>
      <ChoiceRow
        values={CREATOR_GOALS.map((value) => ({ value, label: t(`creator.goal.${value}`) }))}
        selected={f.goal}
        onSelect={(goal) => p({ goal: goal as CreatorStrategy["goal"] })}
      />
      <CreatorField
        label={t("creator.frequency")}
        keyboardType="numeric"
        value={String(f.publishingFrequency)}
        onChangeText={(v) => p({ publishingFrequency: Number(v) || 0 })}
      />
      <CreatorField
        label={t("creator.targetMarkets")}
        value={f.targetMarkets.join(", ")}
        onChangeText={(v) => p({ targetMarkets: split(v) })}
      />
      <CreatorField
        label={t("creator.formats")}
        value={f.preferredContentFormats.join(", ")}
        onChangeText={(v) => p({ preferredContentFormats: split(v) })}
      />
      <CreatorField
        label={t("creator.pillars")}
        value={f.contentPillars.join(", ")}
        onChangeText={(v) => p({ contentPillars: split(v) })}
      />
      <Text style={s.copy}>{t("creator.noSchedule")}</Text>
      <CreatorButton
        disabled={!f.niche.trim() || f.publishingFrequency < 1}
        label={t("common.save")}
        onPress={() => {
          if (session?.user.id)
            void saveCreatorStrategy(session.user.id, f).then(() => setSaved(true));
        }}
      />
      {saved ? <Text style={s.success}>{t("creator.saved")}</Text> : null}
    </CreatorPage>
  );
}
