import { LocalizedCopy } from "@/components/localized-copy";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/screen-state";
import { useArena, useJoinArenaChallenge } from "@/hooks/use-arena";
import {
  arenaProgressLabel,
  isCurrentArenaChallenge,
  resolveArenaChallenge,
  type ArenaChallenge,
} from "@/lib/arena";
import { colors, radius, spacing, typography } from "@/lib/theme";

const period = (challenge: ArenaChallenge) =>
  `${new Date(challenge.startsAt).toLocaleDateString("pt-BR")} – ${new Date(challenge.endsAt).toLocaleDateString("pt-BR")}`;

function ChallengeCard({
  challenge,
  joining,
  onJoin,
}: {
  challenge: ArenaChallenge;
  joining: boolean;
  onJoin(): void;
}) {
  const resolved = resolveArenaChallenge(challenge);
  const stateLabel =
    resolved.state === "completed"
      ? "CONCLUÍDO"
      : resolved.state === "joined"
        ? "PARTICIPANDO"
        : resolved.state === "upcoming"
          ? "EM BREVE"
          : resolved.state === "ended"
            ? "ENCERRADO"
            : "ABERTO";
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.state}>{stateLabel}</Text>
      </View>
      {challenge.description ? <Text style={styles.copy}>{challenge.description}</Text> : null}
      <Text style={styles.progress}>{arenaProgressLabel(challenge)}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${resolved.ratio * 100}%` }]} />
      </View>
      <Text style={styles.meta}>{period(challenge)}</Text>
      {challenge.rewardPoints > 0 ? (
        <Text style={styles.reward}>
          +{challenge.rewardPoints} Momentum após conclusão verificada
        </Text>
      ) : null}
      {resolved.state === "joinable" ? (
        <Pressable
          accessibilityRole="button"
          disabled={joining}
          onPress={onJoin}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{joining ? "Entrando…" : "Participar"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Arena() {
  const arena = useArena();
  const join = useJoinArenaChallenge();
  if (arena.isPending) return <LoadingState title="Carregando desafios verificados…" />;
  if (arena.isError)
    return (
      <ErrorState
        title="Não foi possível abrir a Arena."
        message="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={() => void arena.refetch()}
      />
    );

  const challenges = arena.data ?? [];
  const current = challenges.filter((item) => isCurrentArenaChallenge(item));
  const history = challenges.filter((item) => !isCurrentArenaChallenge(item) && item.joinedAt);
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title="Arena" />
      <Text style={styles.eyebrow}>
        <LocalizedCopy copyKey="legacy.4afa7a478dfb" />
      </Text>
      <Text style={styles.hero}>
        <LocalizedCopy copyKey="legacy.5aa9842d8f20" />
      </Text>
      <Text style={styles.copy}>
        <LocalizedCopy copyKey="legacy.df04ce9030fa" />
      </Text>
      {current.length === 0 ? (
        <EmptyState
          title="Nenhum desafio ativo agora"
          message="Quando houver um desafio real e dentro do período, ele aparecerá aqui. Nada de placares ou participantes inventados."
        />
      ) : (
        current.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            joining={join.isPending && join.variables === challenge.id}
            onJoin={() => join.mutate(challenge.id)}
          />
        ))
      )}
      {join.isError ? (
        <Text style={styles.error}>
          <LocalizedCopy copyKey="legacy.ec850793e10b" />
        </Text>
      ) : null}
      {history.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <LocalizedCopy copyKey="legacy.fef2d814db6d" />
          </Text>
          {history.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              joining={false}
              onJoin={() => undefined}
            />
          ))}
        </View>
      ) : null}
      <Text style={styles.privacy}>
        <LocalizedCopy copyKey="legacy.0de1bc1ba1d3" />
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  hero: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.text, flex: 1 },
  state: { ...typography.eyebrow, color: colors.primaryBright },
  progress: { ...typography.label, color: colors.text },
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  fill: { height: "100%", backgroundColor: colors.primary },
  meta: { ...typography.body, fontSize: 13, color: colors.textMuted },
  reward: { ...typography.label, color: colors.primaryBright },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.text },
  section: { gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.text },
  privacy: { ...typography.body, fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  error: { ...typography.body, color: colors.danger },
});
