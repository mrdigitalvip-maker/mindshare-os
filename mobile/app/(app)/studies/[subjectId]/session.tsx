import { LocalizedCopy } from "@/components/localized-copy";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useSubject, useWorkspaceMutations } from "@/hooks/use-workspaces";
import { reconstructElapsedSeconds } from "@/lib/study-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function StudySession() {
  const { subjectId: raw } = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = typeof raw === "string" ? raw : "";
  const query = useSubject(subjectId);
  const { study } = useWorkspaceMutations();
  const startRef = useRef(false),
    finishRef = useRef(false);
  const [activity, setActivity] = useState(""),
    [planned, setPlanned] = useState("25"),
    [now, setNow] = useState(new Date()),
    [finishing, setFinishing] = useState(false),
    [reflection, setReflection] = useState<"understood" | "review" | "difficult">("understood");
  const active = query.data?.sessions.find((s) => s.status === "active");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(new Date());
        void query.refetch();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [query]);
  useEffect(() => {
    if (active && !activity) setActivity(active.activity);
  }, [active, activity]);
  const elapsed = useMemo(
    () => (active ? reconstructElapsedSeconds(active, now) : 0),
    [active, now],
  );
  if (query.isPending) return <LoadingState title="Preparando sessão…" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Não foi possível abrir a sessão."
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    );

  const display = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  async function start() {
    if (startRef.current) return;
    const minutes = Number(planned);
    startRef.current = true;
    try {
      await study.mutateAsync({
        action: "session-start",
        subjectId,
        activity: activity.trim(),
        plannedMinutes: minutes,
      });
    } catch (error) {
      Alert.alert(
        "Não foi possível iniciar",
        error instanceof Error ? error.message : "Revise os dados e tente novamente.",
      );
    } finally {
      startRef.current = false;
    }
  }
  async function finish() {
    if (!active || finishRef.current) return;
    finishRef.current = true;
    try {
      await study.mutateAsync({
        action: "session-finish",
        subjectId,
        sessionId: active.id,
        activity,
        reflection,
      });
      router.replace(`/studies/${subjectId}`);
    } catch (error) {
      Alert.alert(
        "Não foi possível encerrar",
        error instanceof Error ? error.message : "A sessão continua salva. Tente novamente.",
      );
    } finally {
      finishRef.current = false;
    }
  }
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: "Sessão", gestureEnabled: !active }} />
      <Text style={styles.eyebrow}>{query.data.subject.name.toUpperCase()}</Text>
      {!active ? (
        <>
          <Text style={styles.title}>
            <LocalizedCopy copyKey="legacy.4cbb7da86894" />
          </Text>
          <TextInput
            style={styles.input}
            placeholder="O que você vai estudar?"
            placeholderTextColor={colors.textMuted}
            value={activity}
            onChangeText={setActivity}
          />

          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Minutos planejados"
            placeholderTextColor={colors.textMuted}
            value={planned}
            onChangeText={setPlanned}
          />

          <Pressable
            disabled={study.isPending || !activity.trim()}
            style={styles.primary}
            onPress={() => void start()}
          >
            <Text style={styles.primaryText}>
              {study.isPending ? "Iniciando…" : "Iniciar foco"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.status}>
            <LocalizedCopy copyKey="legacy.cc5d0fd07844" />
          </Text>
          <Text style={styles.timer}>{display}</Text>
          <Text style={styles.copy}>
            <LocalizedCopy copyKey="legacy.91241634440e" />
          </Text>
          <TextInput
            editable={!finishing}
            style={styles.activity}
            value={activity}
            onChangeText={setActivity}
          />

          {!finishing ? (
            <Pressable style={styles.end} onPress={() => setFinishing(true)}>
              <Text style={styles.primaryText}>
                <LocalizedCopy copyKey="legacy.8b450795021a" />
              </Text>
            </Pressable>
          ) : (
            <View style={styles.reflection}>
              <Text style={styles.heading}>
                <LocalizedCopy copyKey="legacy.8835b7137d57" />
              </Text>
              {(
                [
                  ["understood", "Entendi bem"],
                  ["review", "Preciso revisar"],
                  ["difficult", "Tive dificuldade"],
                ] as const
              ).map(([id, label]) => (
                <Pressable
                  key={id}
                  style={[styles.choice, reflection === id && styles.selected]}
                  onPress={() => setReflection(id)}
                >
                  <Text style={styles.body}>{label}</Text>
                </Pressable>
              ))}
              <Pressable
                disabled={!activity.trim() || study.isPending}
                style={styles.primary}
                onPress={() => void finish()}
              >
                <Text style={styles.primaryText}>
                  {study.isPending ? "Salvando…" : "Concluir e salvar"}
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright, textAlign: "center" },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  status: { ...typography.label, color: colors.textMuted, textAlign: "center" },
  timer: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: "300",
    color: colors.text,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  copy: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  input: {
    minHeight: 52,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  activity: { ...typography.heading, color: colors.text, textAlign: "center", padding: spacing.md },
  primary: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  end: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  reflection: { gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text, textAlign: "center" },
  choice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  selected: { borderWidth: 1, borderColor: colors.primaryBright },
  body: { ...typography.body, color: colors.text, textAlign: "center" },
});
