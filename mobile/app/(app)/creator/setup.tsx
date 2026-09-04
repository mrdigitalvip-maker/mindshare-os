import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  ChoiceRow,
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import {
  CREATOR_EXPERIENCE_LEVELS,
  CREATOR_GOALS,
  CREATOR_PLATFORMS,
  type CreatorProfileDraft,
} from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { loadCreatorProfile, saveCreatorProfile } from "@/services/creator-service";
const empty: CreatorProfileDraft = {
  experience: "beginner",
  platforms: [],
  niche: "",
  goal: "grow_followers",
  primaryAudienceRegion: "",
  weeklyPostingCapacity: 1,
  displayName: "",
  usernameIdeas: [],
  bio: "",
  positioning: "",
  category: "",
  callToAction: "",
  contentPillars: [],
  keywords: [],
  brandTone: "",
  visualDirection: "",
};
export default function CreatorSetup() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState(empty);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  useEffect(() => {
    if (session?.user.id) void loadCreatorProfile(session.user.id).then((p) => p && setForm(p));
  }, [session?.user.id]);
  const patch = (p: Partial<CreatorProfileDraft>) => setForm((v) => ({ ...v, ...p }));
  const valid =
    form.platforms.length > 0 &&
    !!form.niche.trim() &&
    !!form.primaryAudienceRegion.trim() &&
    form.weeklyPostingCapacity > 0;
  async function save() {
    if (!session?.user.id || !valid) return;
    setState("saving");
    try {
      await saveCreatorProfile(session.user.id, form);
      setState("saved");
    } catch {
      setState("error");
    }
  }
  return (
    <CreatorPage title={t("creator.setup")} description={t("creator.setupHelp")}>
      <Text style={s.label}>{t("creator.experience")}</Text>
      <ChoiceRow
        values={CREATOR_EXPERIENCE_LEVELS.map((value) => ({
          value,
          label: t(`creator.experience.${value}`),
        }))}
        selected={form.experience}
        onSelect={(v) => patch({ experience: v as CreatorProfileDraft["experience"] })}
      />
      <Text style={s.label}>{t("creator.platforms")}</Text>
      <ChoiceRow
        values={CREATOR_PLATFORMS.map((value) => ({
          value,
          label: value[0].toUpperCase() + value.slice(1),
        }))}
        selected={form.platforms}
        onSelect={(v) =>
          patch({
            platforms: form.platforms.includes(v as never)
              ? form.platforms.filter((x) => x !== v)
              : [...form.platforms, v as never],
          })
        }
      />
      <CreatorField
        label={t("creator.niche")}
        value={form.niche}
        onChangeText={(niche) => patch({ niche })}
      />
      <Text style={s.label}>{t("creator.primaryGoal")}</Text>
      <ChoiceRow
        values={CREATOR_GOALS.map((value) => ({ value, label: t(`creator.goal.${value}`) }))}
        selected={form.goal}
        onSelect={(v) => patch({ goal: v as CreatorProfileDraft["goal"] })}
      />
      <CreatorField
        label={t("creator.audienceRegion")}
        value={form.primaryAudienceRegion}
        onChangeText={(primaryAudienceRegion) => patch({ primaryAudienceRegion })}
      />
      <CreatorField
        label={t("creator.postingCapacity")}
        keyboardType="numeric"
        value={String(form.weeklyPostingCapacity)}
        onChangeText={(v) => patch({ weeklyPostingCapacity: Number(v) || 0 })}
      />
      {!valid ? <Text style={s.error}>{t("creator.validation")}</Text> : null}
      <CreatorButton
        label={state === "saving" ? t("common.loading") : t("common.save")}
        disabled={!valid || state === "saving"}
        onPress={() => void save()}
      />
      {state === "saved" ? (
        <Text style={s.success}>{t("creator.saved")}</Text>
      ) : state === "error" ? (
        <Text style={s.error}>{t("creator.saveError")}</Text>
      ) : null}
    </CreatorPage>
  );
}
