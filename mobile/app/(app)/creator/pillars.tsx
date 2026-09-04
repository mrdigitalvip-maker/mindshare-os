import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { loadCreatorProfile, saveCreatorProfile } from "@/services/creator-service";
import type { CreatorProfileDraft } from "@/lib/creator";
export default function Pillars() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<CreatorProfileDraft | null>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (session?.user.id) void loadCreatorProfile(session.user.id).then(setProfile);
  }, [session?.user.id]);
  const update = (items: string[]) => profile && setProfile({ ...profile, contentPillars: items });
  const move = (i: number, d: number) => {
    if (!profile) return;
    const a = [...profile.contentPillars],
      j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    update(a);
  };
  return (
    <CreatorPage title={t("creator.pillars")} description={t("creator.pillarsHelp")}>
      <CreatorField label={t("creator.newPillar")} value={draft} onChangeText={setDraft} />
      <CreatorButton
        label={t("common.create")}
        disabled={!draft.trim() || !profile}
        onPress={() => {
          update([...(profile?.contentPillars ?? []), draft.trim()]);
          setDraft("");
        }}
      />
      {profile?.contentPillars.map((x, i) => (
        <View style={s.card} key={`${x}-${i}`}>
          <CreatorField
            label={t("creator.pillar")}
            value={x}
            onChangeText={(v) => update(profile.contentPillars.map((p, j) => (j === i ? v : p)))}
          />
          <View style={s.choices}>
            <Pressable onPress={() => move(i, -1)}>
              <Text style={s.copy}>{t("creator.moveUp")}</Text>
            </Pressable>
            <Pressable onPress={() => move(i, 1)}>
              <Text style={s.copy}>{t("creator.moveDown")}</Text>
            </Pressable>
            <Pressable onPress={() => update(profile.contentPillars.filter((_, j) => j !== i))}>
              <Text style={s.error}>{t("common.delete")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <CreatorButton
        label={t("common.save")}
        disabled={!profile}
        onPress={() => {
          if (session?.user.id && profile) void saveCreatorProfile(session.user.id, profile);
        }}
      />
    </CreatorPage>
  );
}
