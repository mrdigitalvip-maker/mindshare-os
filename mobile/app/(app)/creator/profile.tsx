import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import { type CreatorProfileDraft } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { loadCreatorProfile, saveCreatorProfile } from "@/services/creator-service";
const defaults: CreatorProfileDraft = {
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
const split = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export default function ProfileBuilder() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (session?.user.id) void loadCreatorProfile(session.user.id).then((v) => v && setForm(v));
  }, [session?.user.id]);
  const patch = (p: Partial<CreatorProfileDraft>) => {
    setSaved(false);
    setForm((v) => ({ ...v, ...p }));
  };
  async function save() {
    if (session?.user.id) {
      await saveCreatorProfile(session.user.id, form);
      setSaved(true);
    }
  }
  const fields: [string, keyof CreatorProfileDraft, boolean?][] = [
    [t("creator.displayName"), "displayName"],
    [t("creator.usernameIdeas"), "usernameIdeas"],
    [t("creator.bio"), "bio", true],
    [t("creator.positioning"), "positioning", true],
    [t("creator.category"), "category"],
    [t("creator.cta"), "callToAction"],
    [t("creator.pillars"), "contentPillars"],
    [t("creator.keywords"), "keywords"],
    [t("creator.brandTone"), "brandTone"],
    [t("creator.visualDirection"), "visualDirection", true],
  ];
  return (
    <CreatorPage title={t("creator.profileBuilder")} description={t("creator.profileHelp")}>
      {fields.map(([label, key, multi]) => (
        <CreatorField
          key={key}
          label={label}
          multiline={multi}
          value={Array.isArray(form[key]) ? (form[key] as string[]).join(", ") : String(form[key])}
          onChangeText={(value) =>
            patch({ [key]: Array.isArray(form[key]) ? split(value) : value })
          }
        />
      ))}
      <Text style={s.copy}>{t("creator.manualIdeas")}</Text>
      <CreatorButton label={t("common.save")} onPress={() => void save()} />
      {saved ? <Text style={s.success}>{t("creator.saved")}</Text> : null}
    </CreatorPage>
  );
}
