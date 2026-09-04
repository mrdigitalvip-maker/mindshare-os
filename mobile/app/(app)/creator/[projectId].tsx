import { useEffect, useState } from "react";
import { Text, StyleSheet, Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  cancelCreatorJob,
  getCreatorProject,
  getLatestCreatorJob,
  listCreatorClips,
  type CreatorClip,
  type CreatorJob,
  type CreatorProject,
} from "@/services/creator-service";
import { colors, spacing, typography } from "@/lib/theme";
export default function CreatorProjectScreen() {
  const params = useLocalSearchParams<{ projectId?: string | string[] }>();
  const id = typeof params.projectId === "string" ? params.projectId : "";
  const { session } = useAuth();
  const { t } = useLanguage();
  const [p, setP] = useState<CreatorProject | null>();
  const [job, setJob] = useState<CreatorJob | null>(null);
  const [clips, setClips] = useState<CreatorClip[]>([]);
  useEffect(() => {
    if (session?.user.id && id) {
      const load = () =>
        Promise.all([
          getCreatorProject(session.user.id, id),
          getLatestCreatorJob(session.user.id, id),
          listCreatorClips(session.user.id, id),
        ])
          .then(([project, current, results]) => {
            setP(project);
            setJob(current);
            setClips(results);
          })
          .catch(() => setP(null));
      void load();
      const timer = setInterval(() => void load(), 5000);
      return () => clearInterval(timer);
    } else setP(null);
  }, [id, session?.user.id]);
  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      {p === undefined ? (
        <Text style={s.copy}>{t("common.loading")}</Text>
      ) : p === null ? (
        <Text style={s.title}>{t("creator.invalidRoute")}</Text>
      ) : (
        <>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.copy}>
            {t("creator.aspect")}: {p.aspectRatio}
          </Text>
          <Text style={s.copy}>
            {t("creator.captions")}:{" "}
            {p.captionsEnabled ? t("creator.captionsAuto") : t("creator.captionsOff")}
          </Text>
          <Text style={s.copy}>{t("creator.foundation")}</Text>
          {job ? <Text style={s.stage}>{job.progressStage ?? job.status}</Text> : null}
          {job?.errorCode ? <Text style={s.error}>{job.errorCode}</Text> : null}
          {job &&
          ["queued", "analyzing", "transcribing", "selecting_clips", "rendering"].includes(
            job.status,
          ) ? (
            <Pressable style={s.button} onPress={() => void cancelCreatorJob(job.id)}>
              <Text style={s.buttonText}>{t("creator.cancelProcessing")}</Text>
            </Pressable>
          ) : null}
          {clips.map((clip) => (
            <View key={clip.id} style={s.card}>
              <Text style={s.title}>
                #{clip.rank}
                {clip.rank === 1 ? ` — ${t("creator.highestPotential")}` : ""}
              </Text>
              <Text style={s.copy}>
                {Math.round(clip.durationMs / 1000)}s · {t("creator.clipScore")}: {clip.score}/100
              </Text>
              <Text style={s.copy}>{clip.scoreReason}</Text>
              <Text style={s.excerpt}>{clip.transcriptExcerpt}</Text>
            </View>
          ))}
        </>
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  stage: { ...typography.heading, color: colors.primary },
  error: { ...typography.body, color: colors.danger },
  button: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: 12 },
  buttonText: { ...typography.body, color: colors.text },
  card: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 12 },
  excerpt: { ...typography.body, color: colors.text },
});
