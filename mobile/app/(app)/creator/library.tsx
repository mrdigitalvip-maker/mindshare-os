import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  deleteCreatorProject,
  listCreatorProjects,
  type CreatorProject,
} from "@/services/creator-service";
export default function Library() {
  const { session } = useAuth();
  const { t, resolvedLocale } = useLanguage();
  const [data, setData] = useState<CreatorProject[]>([]);
  const load = () =>
    session?.user.id ? listCreatorProjects(session.user.id).then(setData) : Promise.resolve();
  useEffect(() => {
    if (session?.user.id) void listCreatorProjects(session.user.id).then(setData);
  }, [session?.user.id]);
  function remove(p: CreatorProject) {
    Alert.alert(t("creator.deleteProject"), t("creator.metadataOnly"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          if (session?.user.id) void deleteCreatorProject(session.user.id, p.id).then(load);
        },
      },
    ]);
  }
  return (
    <CreatorPage title={t("creator.library")}>
      {data.length === 0 ? (
        <Text style={s.copy}>{t("creator.empty")}</Text>
      ) : (
        data.map((p) => (
          <View style={s.card} key={p.id}>
            <Pressable onPress={() => router.push(`/creator/${p.id}`)}>
              <Text style={s.heading}>{p.title}</Text>
              <Text style={s.copy}>
                {p.sourceType} ·{" "}
                {new Intl.DateTimeFormat(resolvedLocale).format(new Date(p.createdAt))}
              </Text>
              <Text style={s.copy}>{p.status}</Text>
            </Pressable>
            <Pressable onPress={() => remove(p)}>
              <Text style={s.error}>{t("common.delete")}</Text>
            </Pressable>
          </View>
        ))
      )}
    </CreatorPage>
  );
}
