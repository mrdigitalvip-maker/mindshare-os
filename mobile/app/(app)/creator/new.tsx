import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AppScreen } from "@/components/app-screen";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "expo-router";
import { createAndUploadCreatorVideo, enqueueCreatorProject } from "@/services/creator-service";
import {
  CREATOR_ASPECT_RATIOS,
  CREATOR_CAPTION_MODES,
  CREATOR_CLIP_DURATIONS,
  recognizeCreatorUrl,
} from "@/lib/creator";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function NewCreatorProject() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<{
    uri: string;
    fileName?: string | null;
    mimeType?: string;
    fileSize?: number;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.uri.trim()) setFile(asset);
  };
  const submit = async () => {
    if (!session?.user.id || !file || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const id = await createAndUploadCreatorVideo({
        userId: session.user.id,
        title,
        uri: file.uri,
        fileName: file.fileName ?? `video-${Date.now()}.mp4`,
        contentType: file.mimeType ?? "application/octet-stream",
        fileSize: file.fileSize,
        aspectRatio: "9:16",
        targetDuration: 30,
        captionsEnabled: true,
      });
      await enqueueCreatorProject(id);
      router.replace({ pathname: "/(app)/creator/[projectId]", params: { projectId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload_failed");
    } finally {
      setBusy(false);
    }
  };
  const recognized = url ? recognizeCreatorUrl(url) : null;
  return (
    <AppScreen scroll keyboard contentContainerStyle={s.page}>
      <Text style={s.title}>{t("creator.new")}</Text>
      <TextInput
        accessibilityLabel={t("creator.projectTitle")}
        placeholder={t("creator.projectTitle")}
        placeholderTextColor={colors.textMuted}
        value={title}
        onChangeText={setTitle}
        style={s.input}
      />
      <Text style={s.heading}>{t("creator.source")}</Text>
      <Pressable style={s.button} onPress={() => void pick()}>
        <Text style={s.buttonText}>{t("creator.local")}</Text>
      </Pressable>
      {file ? <Text style={s.copy}>✓ {file.fileName ?? file.uri.split("/").pop()}</Text> : null}
      <TextInput
        accessibilityLabel={t("creator.url")}
        autoCapitalize="none"
        keyboardType="url"
        placeholder={t("creator.url")}
        placeholderTextColor={colors.textMuted}
        value={url}
        onChangeText={setUrl}
        style={s.input}
      />
      {recognized?.requiresOriginalUpload ? (
        <Text style={s.copy}>{t("creator.originalRequired")}</Text>
      ) : null}
      <Text style={s.heading}>{t("creator.aspect")}</Text>
      <View style={s.row}>
        {CREATOR_ASPECT_RATIOS.map((v) => (
          <Text key={v} style={s.chip}>
            {v}
          </Text>
        ))}
      </View>
      <Text style={s.heading}>{t("creator.duration")}</Text>
      <View style={s.row}>
        {CREATOR_CLIP_DURATIONS.map((v) => (
          <Text key={v} style={s.chip}>
            {v}s
          </Text>
        ))}
      </View>
      <Text style={s.heading}>{t("creator.captions")}</Text>
      <View style={s.row}>
        {CREATOR_CAPTION_MODES.map((v) => (
          <Text key={v} style={s.chip}>
            {v === "automatic" ? t("creator.captionsAuto") : t("creator.captionsOff")}
          </Text>
        ))}
      </View>
      <Text style={s.copy}>{t("creator.foundation")}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Pressable
        disabled={busy || !file || !title.trim()}
        style={[s.button, (busy || !file || !title.trim()) && s.disabled]}
        onPress={() => void submit()}
      >
        <Text style={s.buttonText}>
          {busy ? t("creator.uploading") : t("creator.processVideo")}
        </Text>
      </Pressable>
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text,
  },
  button: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  buttonText: { ...typography.body, color: colors.text, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  error: { ...typography.body, color: colors.danger },
  disabled: { opacity: 0.5 },
});
