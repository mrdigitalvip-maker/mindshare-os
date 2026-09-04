import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { CREATOR_ACADEMY } from "@/lib/creator";
import { useLanguage } from "@/providers/language-provider";
export default function Academy() {
  const { t } = useLanguage();
  return (
    <CreatorPage title={t("creator.academy")}>
      {Object.entries(CREATOR_ACADEMY).map(([level, lessons]) => (
        <View style={s.card} key={level}>
          <Text style={s.heading}>{t(`creator.academy.${level}`)}</Text>
          {lessons.map((lesson) => (
            <Pressable key={lesson} onPress={() => router.push(`/creator/academy/${lesson}`)}>
              <Text style={s.copy}>{t(`creator.lesson.${lesson}`)}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </CreatorPage>
  );
}
