import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import {
  useAcceptInvite,
  useCommunity,
  useCreateSquad,
  useReact,
  useSaveCommunityProfile,
  useOfficialChannels,
  useOfficialChannelActions,
} from "@/hooks/use-community";
import {
  communityErrorMessage,
  type CommunityProfile,
  type CommunityReaction,
} from "@/lib/community";
import { colors, radius, spacing, typography } from "@/lib/theme";

const blank: CommunityProfile = {
  displayName: null,
  username: null,
  avatarUrl: null,
  bio: null,
  visibility: "private",
  showMomentum: false,
  showStreak: false,
  showVerifiedActivity: false,
};
const Button = ({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.button, disabled && styles.disabled]}
  >
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);
export default function Community() {
  const community = useCommunity(),
    channels = useOfficialChannels(),
    channelActions = useOfficialChannelActions(),
    save = useSaveCommunityProfile(),
    create = useCreateSquad(),
    accept = useAcceptInvite(),
    react = useReact();
  const [profile, setProfile] = useState(blank),
    [squadName, setSquadName] = useState(""),
    [code, setCode] = useState("");
  useEffect(() => {
    if (community.data?.profile) setProfile(community.data.profile);
  }, [community.data?.profile]);
  const fail = (e: unknown) => Alert.alert("Não foi possível", communityErrorMessage(e));
  if (community.isPending) return <LoadingState title="Carregando Community…" />;
  if (community.isError)
    return (
      <ErrorState
        title="Não foi possível abrir Community."
        message="Seus dados continuam seguros."
        actionLabel="Tentar novamente"
        onAction={() => void community.refetch()}
      />
    );
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title="Community" />
      <Text style={styles.subtitle}>
        Conversas reais para avançar objetivos — sem contagens ou atividade simuladas.
      </Text>
      <Text style={styles.heading}>Comunidades oficiais</Text>
      {channels.isError ? (
        <Text style={styles.muted}>
          Não foi possível carregar as conversas. Toque em tentar novamente.
        </Text>
      ) : null}
      {channels.data?.map((channel) => (
        <View key={channel.id} style={styles.card}>
          <Text style={styles.heading}>{channel.name}</Text>
          <Text style={styles.muted}>
            {channel.premium
              ? "Espaço Premium, validado pelo servidor."
              : "Aberta para contas Free e Premium."}
          </Text>
          {channel.recentBody && channel.joined ? (
            <Text style={styles.body} numberOfLines={2}>
              {channel.recentBody}
            </Text>
          ) : (
            <Text style={styles.muted}>
              {channel.joined
                ? "Ainda não há mensagens. Comece uma conversa útil."
                : channel.eligible
                  ? "Participe quando quiser — sua entrada é explícita."
                  : "Indisponível no seu plano atual."}
            </Text>
          )}
          <Button
            label={
              channel.joined
                ? "Abrir conversa"
                : channel.eligible
                  ? "Entrar"
                  : "Community+ bloqueada"
            }
            disabled={!channel.eligible || channelActions.join.isPending}
            onPress={() =>
              channel.joined
                ? router.push({
                    pathname: "/community/[channelId]",
                    params: { channelId: channel.id, name: channel.name },
                  })
                : channelActions.join.mutate(channel.id, { onError: fail })
            }
          />
        </View>
      ))}
      <View style={styles.card}>
        <Text style={styles.heading}>Seu perfil comunitário</Text>
        <Text style={styles.muted}>
          Privado por padrão. Email, tarefas, projetos e estudos nunca são publicados.
        </Text>
        <TextInput
          accessibilityLabel="Nome comunitário"
          placeholder="Nome público"
          placeholderTextColor={colors.textMuted}
          value={profile.displayName ?? ""}
          onChangeText={(v) => setProfile({ ...profile, displayName: v })}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Username"
          autoCapitalize="none"
          placeholder="username"
          placeholderTextColor={colors.textMuted}
          value={profile.username ?? ""}
          onChangeText={(v) => setProfile({ ...profile, username: v.toLowerCase() })}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Bio"
          placeholder="Bio curta (opcional)"
          placeholderTextColor={colors.textMuted}
          value={profile.bio ?? ""}
          onChangeText={(v) => setProfile({ ...profile, bio: v })}
          maxLength={240}
          style={styles.input}
        />
        <Row label="Perfil visível na Community">
          <Switch
            value={profile.visibility === "community"}
            onValueChange={(v) =>
              setProfile({ ...profile, visibility: v ? "community" : "private" })
            }
          />
        </Row>
        <Row label="Compartilhar Momentum">
          <Switch
            value={profile.showMomentum}
            onValueChange={(v) => setProfile({ ...profile, showMomentum: v })}
          />
        </Row>
        <Row label="Compartilhar streak">
          <Switch
            value={profile.showStreak}
            onValueChange={(v) => setProfile({ ...profile, showStreak: v })}
          />
        </Row>
        <Row label="Compartilhar execução verificada">
          <Switch
            value={profile.showVerifiedActivity}
            onValueChange={(v) => setProfile({ ...profile, showVerifiedActivity: v })}
          />
        </Row>
        <Button
          label={save.isPending ? "Salvando…" : "Salvar privacidade"}
          disabled={save.isPending}
          onPress={() => save.mutate(profile, { onError: fail })}
        />
      </View>
      <Text style={styles.heading}>Seus Squads</Text>
      {community.data?.squads.length ? (
        community.data.squads.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => router.push(`/community/squads/${s.id}`)}
            style={styles.card}
          >
            <Text style={styles.heading}>{s.name}</Text>
            <Text style={styles.muted}>
              {s.memberCount} de {s.maxMembers} membros ·{" "}
              {s.role === "owner" ? "Responsável" : "Membro"}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.muted}>Você ainda não participa de um Squad.</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>Criar Squad privado</Text>
        <TextInput
          placeholder="Nome do Squad"
          placeholderTextColor={colors.textMuted}
          value={squadName}
          onChangeText={setSquadName}
          style={styles.input}
        />
        <Button
          label={create.isPending ? "Criando…" : "Criar Squad"}
          disabled={create.isPending || squadName.trim().length < 2}
          onPress={() =>
            create.mutate(
              { name: squadName, description: "" },
              {
                onSuccess: (id) => {
                  setSquadName("");
                  router.push(`/community/squads/${id}`);
                },
                onError: fail,
              },
            )
          }
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Entrar com convite</Text>
        <TextInput
          autoCapitalize="characters"
          placeholder="Código"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={setCode}
          style={styles.input}
        />
        <Button
          label="Validar convite"
          disabled={!code.trim() || accept.isPending}
          onPress={() =>
            accept.mutate(code, {
              onSuccess: (id) => {
                setCode("");
                router.push(`/community/squads/${id}`);
              },
              onError: fail,
            })
          }
        />
      </View>
      {community.data?.activity.length ? (
        <>
          <Text style={styles.heading}>Atividade recente</Text>
          {community.data.activity.map((a) => (
            <View key={a.id} style={styles.card}>
              <Text style={styles.heading}>{a.displayName}</Text>
              <Text style={styles.muted}>
                Concluiu uma missão verificada ·{" "}
                {new Date(a.occurredAt).toLocaleDateString("pt-BR")}
              </Text>
              <View style={styles.actions}>
                {(["support", "celebrate", "respect"] as CommunityReaction[]).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() =>
                      react.mutate(
                        { activityId: a.id, reaction: a.myReaction === r ? null : r },
                        { onError: fail },
                      )
                    }
                    style={[styles.chip, a.myReaction === r && styles.selected]}
                  >
                    <Text style={styles.chipText}>
                      {r === "support" ? "Apoio" : r === "celebrate" ? "Celebrar" : "Respeito"}{" "}
                      {a.reactions[r] ?? 0}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.row}>
    <Text style={styles.body}>{label}</Text>
    {children}
  </View>
);
const styles = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xl },
  subtitle: { ...typography.body, color: colors.textMuted },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  heading: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.text, flex: 1 },
  muted: { ...typography.body, color: colors.textMuted },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  buttonText: { ...typography.label, color: colors.background },
  disabled: { opacity: 0.45 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  selected: { borderColor: colors.primaryBright, backgroundColor: colors.accentMuted },
  chipText: { ...typography.caption, color: colors.text },
});
