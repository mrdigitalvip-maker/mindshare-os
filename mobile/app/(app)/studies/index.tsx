import { LocalizedCopy } from "@/components/localized-copy";
import { useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { NativeFormModal } from "@/components/native-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useStudyOverview, useWorkspaceMutations } from "@/hooks/use-workspaces";
import {
  getTodayStudyMinutes,
  getWeeklyStudyMinutes,
  selectStudyFocus,
} from "@/lib/study-selectors";
import { colors, radius, spacing, typography } from "@/lib/theme";

export default function Estudos() {
  const query = useStudyOverview();
  const { createSubject } = useWorkspaceMutations();
  const savingRef = useRef(false);
  const [modal, setModal] = useState(false),
    [name, setName] = useState(""),
    [objective, setObjective] = useState(""),
    [weekly, setWeekly] = useState("120");
  const focus = useMemo(() => selectStudyFocus(query.data ?? []), [query.data]);
  if (query.isPending) return <LoadingState title="Carregando estudos…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar agora."
        actionLabel="Tentar novamente"
        onAction={() => void query.refetch()}
      />
    );

  const workspaces = query.data ?? [];
  const allSessions = workspaces.flatMap((item) => item.sessions);
  async function save() {
    if (savingRef.current) return;
    const parsed = weekly.trim() ? Number(weekly) : null;
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 10080)) return;
    savingRef.current = true;
    try {
      const id = await createSubject.mutateAsync({ name, objective, weeklyTargetMinutes: parsed });
      setModal(false);
      setName("");
      setObjective("");
      setWeekly("120");
      router.push(`/studies/${id}`);
    } finally {
      savingRef.current = false;
    }
  }
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>
          <LocalizedCopy copyKey="legacy.ba6f58b7d44f" />
        </Text>
        <Pressable onPress={() => setModal(true)} style={styles.add}>
          <Text style={styles.addText}>
            <LocalizedCopy copyKey="legacy.8a344124bcbf" />
          </Text>
        </Pressable>
      </View>
      <FlatList
        data={workspaces}
        keyExtractor={(item) => item.subject.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={workspaces.length ? styles.list : styles.empty}
        ListHeaderComponent={
          workspaces.length ? (
            <View style={styles.top}>
              <Text style={styles.eyebrow}>
                <LocalizedCopy copyKey="legacy.2eefe7f57c93" />
              </Text>
              {getTodayStudyMinutes(allSessions) > 0 ? (
                <Text style={styles.signal}>
                  {getTodayStudyMinutes(allSessions)} min estudados hoje
                </Text>
              ) : null}
              {focus ? (
                <View style={styles.focus}>
                  <Text style={styles.eyebrow}>
                    <LocalizedCopy copyKey="legacy.daf3ae9adb32" />
                  </Text>
                  <Text style={styles.focusTitle}>{focus.subject.name}</Text>
                  <Text style={styles.copy}>
                    {focus.subject.nextAction
                      ? `Próximo passo: ${focus.subject.nextAction}`
                      : focus.subject.objective || "Defina seu próximo objetivo."}
                  </Text>
                  <Pressable
                    style={styles.primary}
                    onPress={() => router.push(`/studies/${focus.subject.id}`)}
                  >
                    <Text style={styles.primaryText}>
                      {focus.sessions.some((s) => s.status === "active")
                        ? "Retomar sessão"
                        : "Continuar"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="COMECE SEU PRIMEIRO PLANO DE ESTUDO"
            message="Crie uma matéria, defina o que quer aprender e acompanhe suas sessões e progresso."
            actionLabel="Criar matéria"
            onAction={() => setModal(true)}
          />
        }
        renderItem={({ item }) => {
          const weeklyMinutes = getWeeklyStudyMinutes(item.sessions);
          return (
            <Pressable
              onPress={() => router.push(`/studies/${item.subject.id}`)}
              style={styles.card}
            >
              <View style={[styles.color, { backgroundColor: item.subject.color }]} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.subject.name}</Text>
                <Text style={styles.status}>
                  {item.subject.status === "active"
                    ? "Em andamento"
                    : item.subject.status === "paused"
                      ? "Pausada"
                      : "Concluída"}
                </Text>
                {item.subject.objective ? (
                  <Text style={styles.copy}>{item.subject.objective}</Text>
                ) : null}
                {item.subject.nextAction ? (
                  <Text style={styles.next}>Próximo: {item.subject.nextAction}</Text>
                ) : null}
                {weeklyMinutes ? (
                  <Text style={styles.meta}>{weeklyMinutes} min esta semana</Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <NativeFormModal
        visible={modal}
        title="Novo plano de estudo"
        placeholder="O que você quer estudar?"
        value={name}
        onChange={setName}
        secondaryValue={objective}
        secondaryPlaceholder="O que você quer alcançar?"
        onSecondaryChange={setObjective}
        busy={createSubject.isPending}
        error={createSubject.error?.message}
        errorMessage={createSubject.error?.message}
        onClose={() => {
          if (!savingRef.current) setModal(false);
        }}
        onSave={() => void save()}
      >
        <TextInput
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="number-pad"
          placeholder="Meta semanal em minutos (opcional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </NativeFormModal>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.text },
  add: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...typography.label, color: colors.text },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { flexGrow: 1 },
  top: { gap: spacing.md, marginBottom: spacing.md },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  signal: { ...typography.body, color: colors.text },
  focus: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  focusTitle: { ...typography.title, color: colors.text },
  primary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.label, color: colors.text },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  color: { width: 5, borderRadius: radius.pill },
  flex: { flex: 1, gap: spacing.xs },
  cardTitle: { ...typography.heading, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  next: { ...typography.label, color: colors.primaryBright },
  meta: { ...typography.caption, color: colors.textMuted },
  status: { ...typography.caption, color: colors.primaryBright },
  input: {
    minHeight: 50,
    padding: spacing.md,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
