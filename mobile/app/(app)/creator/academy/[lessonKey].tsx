import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { CreatorButton, CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { CREATOR_ACADEMY } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCompletedLessons, setLessonCompletion } from "@/services/creator-service";
export default function Lesson() {
  const { lessonKey } = useLocalSearchParams<{ lessonKey: string }>();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [done, setDone] = useState(false);
  const valid = Object.values(CREATOR_ACADEMY)
    .flat()
    .includes(lessonKey as never);
  useEffect(() => {
    if (session?.user.id)
      void listCompletedLessons(session.user.id).then((v) => setDone(v.includes(lessonKey)));
  }, [session?.user.id, lessonKey]);
  if (!valid)
    return (
      <CreatorPage title={t("creator.lessonMissing")}>
        <Text style={s.error}>{t("creator.lessonMissingHelp")}</Text>
      </CreatorPage>
    );
  return (
    <CreatorPage title={t(`creator.lesson.${lessonKey}`)}>
      <Text style={s.copy}>{t(`creator.lessonBody.${lessonKey}`)}</Text>
      <CreatorButton
        label={done ? t("creator.markIncomplete") : t("creator.markComplete")}
        onPress={() => {
          if (session?.user.id)
            void setLessonCompletion(session.user.id, lessonKey, !done).then(() => setDone(!done));
        }}
      />
    </CreatorPage>
  );
}
