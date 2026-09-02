import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useSquad, useSquadActions } from "@/hooks/use-community";
import { communityErrorMessage } from "@/lib/community";
import { colors, radius, spacing, typography } from "@/lib/theme";
export default function Squad() {
  const { squadId = "" } = useLocalSearchParams<{ squadId: string }>(),
    q = useSquad(squadId),
    actions = useSquadActions(squadId);
  const fail = (e: unknown) => Alert.alert("Não foi possível", communityErrorMessage(e));
  if (q.isPending) return <LoadingState title="Carregando Squad…" />;
  if (q.isError || !q.data)
    return (
      <ErrorState
        title="Squad indisponível."
        message="Ele pode ter sido encerrado ou você não é mais membro."
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    );
  const s = q.data;
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title={s.name} />
      {s.description ? <Text style={styles.muted}>{s.description}</Text> : null}
      <Text style={styles.muted}>
        {s.members.length} de {s.maxMembers} membros
      </Text>
      <Text style={styles.heading}>Membros</Text>
      {s.members.map((m) => (
        <View key={m.userId} style={styles.member}>
          <Text style={styles.body}>{m.displayName}</Text>
          <Text style={styles.muted}>{m.role === "owner" ? "Responsável" : "Membro"}</Text>
          {s.role === "owner" && m.role === "member" ? (
            <Pressable
              accessibilityLabel={`Remover ${m.displayName} do Squad`}
              onPress={() => actions.remove.mutate(m.userId, { onError: fail })}
            >
              <Text style={styles.danger}>Remover</Text>
            </Pressable>
          ) : null}
          {!m.isSelf ? (
            <View style={styles.inlineActions}>
              <Pressable
                accessibilityLabel={`Reportar ${m.displayName}`}
                onPress={() =>
                  actions.reportMember.mutate(m.userId, {
                    onSuccess: () =>
                      Alert.alert("Recebemos seu reporte", "Ele ficará pendente para análise."),
                    onError: fail,
                  })
                }
              >
                <Text style={styles.secondary}>Reportar</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Bloquear ${m.displayName}`}
                onPress={() => actions.block.mutate(m.userId, { onError: fail })}
              >
                <Text style={styles.danger}>Bloquear</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
      {s.role === "owner" ? (
        <>
          <Pressable
            accessibilityLabel="Criar código de convite do Squad"
            style={styles.button}
            onPress={() =>
              actions.invite.mutate(undefined, {
                onSuccess: (code) =>
                  Alert.alert(
                    "Convite criado",
                    `Compartilhe este código com a pessoa: ${code}\nEle expira em 7 dias.`,
                  ),
                onError: fail,
              })
            }
          >
            <Text style={styles.buttonText}>Criar código de convite</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Encerrar Squad", "Membros e convites serão removidos.", [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Encerrar",
                  style: "destructive",
                  onPress: () =>
                    actions.deleteSquad.mutate(undefined, {
                      onSuccess: () => router.replace("/community"),
                      onError: fail,
                    }),
                },
              ])
            }
          >
            <Text style={styles.danger}>Encerrar Squad</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() =>
            actions.leave.mutate(undefined, {
              onSuccess: () => router.replace("/community"),
              onError: fail,
            })
          }
        >
          <Text style={styles.danger}>Sair do Squad</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() =>
          actions.reportSquad.mutate(undefined, {
            onSuccess: () =>
              Alert.alert("Recebemos seu reporte", "Ele ficará pendente para análise."),
            onError: fail,
          })
        }
      >
        <Text style={styles.secondary}>Reportar Squad</Text>
      </Pressable>
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text, flex: 1 },
  muted: { ...typography.body, color: colors.textMuted },
  member: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.background },
  danger: { ...typography.label, color: colors.danger },
  secondary: { ...typography.label, color: colors.textMuted },
  inlineActions: { flexDirection: "row", gap: spacing.md },
});
