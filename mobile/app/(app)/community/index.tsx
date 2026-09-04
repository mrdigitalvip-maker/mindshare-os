import { LocalizedCopy } from "@/components/localized-copy";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { LoadingState } from "@/components/screen-state";
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
  hasActiveOfficialMembership,
  type CommunityProfile,
  type CommunityReaction,
} from "@/lib/community";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { initials, normalizeCommunityProfile, profileValidation } from "@/lib/community-ui";

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
  const savingProfile = useRef(false),
    creatingSquad = useRef(false),
    joiningSquad = useRef(false),
    reactingActivity = useRef(new Set<string>());
  const [profile, setProfile] = useState(blank),
    [editingProfile, setEditingProfile] = useState(!community.data?.profile),
    [profileFeedback, setProfileFeedback] = useState<string | null>(null),
    [squadName, setSquadName] = useState(""),
    [code, setCode] = useState("");
  useEffect(() => {
    if (community.data?.profile) {
      setProfile(community.data.profile);
      setEditingProfile(false);
    }
  }, [community.data?.profile]);
  const persistedProfile = community.data?.profile ?? null;
  const validation = profileValidation(
    profile.displayName ?? "",
    normalizeCommunityProfile(profile).username ?? "",
    profile.visibility === "community",
  );
  const fail = (e: unknown) => Alert.alert("Não foi possível", communityErrorMessage(e));
  if (community.isPending) return <LoadingState title="Carregando Community…" />;
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title="Community" />
      <Text style={styles.subtitle}>
        <LocalizedCopy copyKey="legacy.ec46754a4d22" />
      </Text>
      <Text style={styles.heading}>
        <LocalizedCopy copyKey="legacy.a2c509954b40" />
      </Text>
      {channels.isError ? (
        <Text style={styles.muted}>
          <LocalizedCopy copyKey="legacy.af94c81f4036" />
        </Text>
      ) : null}
      {channels.data?.map((channel) => (
        <View key={channel.id} style={styles.card}>
          <Text style={styles.heading}>{channel.name}</Text>
          <Text style={styles.muted}>
            {channel.premium
              ? "Um espaço exclusivo para membros Premium."
              : "Converse sobre objetivos, progresso, dúvidas e próximos passos."}
          </Text>
          {channel.recentBody && hasActiveOfficialMembership(channel) ? (
            <Text style={styles.body} numberOfLines={2}>
              {channel.recentBody}
            </Text>
          ) : (
            <Text style={styles.muted}>
              {hasActiveOfficialMembership(channel)
                ? "Ainda não há mensagens nesta conversa."
                : channel.eligible
                  ? "Entre para participar da conversa."
                  : "Indisponível no seu plano atual."}
            </Text>
          )}
          <Button
            label={
              hasActiveOfficialMembership(channel)
                ? "Abrir conversa"
                : channel.eligible
                  ? "Entrar"
                  : "Indisponível no seu plano"
            }
            disabled={!channel.eligible || channelActions.join.isPending}
            onPress={() =>
              hasActiveOfficialMembership(channel)
                ? router.push({
                    pathname: "/community/[channelId]",
                    params: { channelId: channel.id },
                  })
                : channelActions.join.mutate(channel.id, { onError: fail })
            }
          />
        </View>
      ))}
      {community.isError ? (
        <View style={styles.card}>
          <Text style={styles.heading}>
            <LocalizedCopy copyKey="legacy.21d9191b0740" />
          </Text>
          <Text style={styles.muted}>
            <LocalizedCopy copyKey="legacy.51985864bc4e" />
          </Text>
          <Button label="Tentar novamente" onPress={() => void community.refetch()} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.heading}>
            {persistedProfile ? "Seu perfil na Community" : "Crie seu perfil na Community"}
          </Text>
          <Text style={styles.muted}>
            <LocalizedCopy copyKey="legacy.c453ef98bd7f" />
          </Text>
          {profileFeedback ? <Text style={styles.success}>{profileFeedback}</Text> : null}
          {persistedProfile && !editingProfile ? (
            <>
              <View style={styles.profilePreview}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitials}>
                    {initials(persistedProfile.displayName ?? persistedProfile.username ?? "?")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heading}>
                    {persistedProfile.displayName || "Perfil privado"}
                  </Text>
                  {persistedProfile.username ? (
                    <Text style={styles.muted}>@{persistedProfile.username}</Text>
                  ) : null}
                  {persistedProfile.bio ? (
                    <Text style={styles.body}>{persistedProfile.bio}</Text>
                  ) : null}
                  <Text style={styles.status}>
                    {persistedProfile.visibility === "community"
                      ? "Visível na Community"
                      : "Privado"}
                  </Text>
                </View>
              </View>
              <Button
                label="Editar perfil"
                onPress={() => {
                  setProfileFeedback(null);
                  setEditingProfile(true);
                }}
              />
            </>
          ) : (
            <>
              <TextInput
                accessibilityLabel="Nome comunitário"
                placeholder="Nome público"
                placeholderTextColor={colors.textMuted}
                value={profile.displayName ?? ""}
                onChangeText={(v) => setProfile({ ...profile, displayName: v })}
                maxLength={60}
                style={styles.input}
              />

              <TextInput
                accessibilityLabel="Username"
                autoCapitalize="none"
                placeholder="@username"
                placeholderTextColor={colors.textMuted}
                value={profile.username ?? ""}
                onChangeText={(v) => setProfile({ ...profile, username: v.toLowerCase() })}
                maxLength={31}
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

              <Text style={styles.label}>
                <LocalizedCopy copyKey="legacy.1547e23d9a41" />
              </Text>
              <View style={styles.visibility}>
                <Pressable
                  onPress={() => setProfile({ ...profile, visibility: "private" })}
                  style={[styles.choice, profile.visibility === "private" && styles.selected]}
                >
                  <Text style={styles.chipText}>
                    <LocalizedCopy copyKey="legacy.49a4e6191e75" />
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProfile({ ...profile, visibility: "community" })}
                  style={[styles.choice, profile.visibility === "community" && styles.selected]}
                >
                  <Text style={styles.chipText}>
                    <LocalizedCopy copyKey="legacy.d826235eee56" />
                  </Text>
                </Pressable>
              </View>
              <Row label="Compartilhar Momentum">
                <Switch
                  value={profile.showMomentum}
                  onValueChange={(v) => setProfile({ ...profile, showMomentum: v })}
                />
              </Row>
              <Row label="Compartilhar execução verificada">
                <Switch
                  value={profile.showVerifiedActivity}
                  onValueChange={(v) => setProfile({ ...profile, showVerifiedActivity: v })}
                />
              </Row>
              <Button
                label={
                  save.isPending ? "Salvando…" : persistedProfile ? "Salvar perfil" : "Criar perfil"
                }
                disabled={save.isPending || Boolean(validation)}
                onPress={() => {
                  if (validation || savingProfile.current) return;
                  savingProfile.current = true;
                  const creating = !persistedProfile;
                  save.mutate(normalizeCommunityProfile(profile), {
                    onSuccess: () => {
                      setProfileFeedback(creating ? "Perfil criado" : "Perfil atualizado");
                      setEditingProfile(false);
                    },
                    onError: fail,
                    onSettled: () => {
                      savingProfile.current = false;
                    },
                  });
                }}
              />

              {validation ? <Text style={styles.validation}>{validation}</Text> : null}
            </>
          )}
        </View>
      )}
      <Text style={styles.heading}>
        <LocalizedCopy copyKey="legacy.27018f233ea5" />
      </Text>
      {community.isError ? (
        <Text style={styles.muted}>
          <LocalizedCopy copyKey="legacy.549390a2c08d" />
        </Text>
      ) : community.data?.activity.length ? (
        <>
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
                      !reactingActivity.current.has(a.id) &&
                      (reactingActivity.current.add(a.id),
                      react.mutate(
                        { activityId: a.id, reaction: a.myReaction === r ? null : r },
                        {
                          onError: fail,
                          onSettled: () => reactingActivity.current.delete(a.id),
                        },
                      ))
                    }
                    accessibilityLabel={`${r === "support" ? "Apoiar" : r === "celebrate" ? "Celebrar" : "Respeitar"} atividade de ${a.displayName}`}
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
      ) : (
        <Text style={styles.muted}>
          <LocalizedCopy copyKey="legacy.bccd0f29e3f9" />
        </Text>
      )}
      <Text style={styles.heading}>
        <LocalizedCopy copyKey="legacy.b8512a2d9d1c" />
      </Text>
      {community.isError ? (
        <Text style={styles.muted}>
          <LocalizedCopy copyKey="legacy.4ca6157993ef" />
        </Text>
      ) : community.data?.squads.length ? (
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
        <Text style={styles.muted}>
          <LocalizedCopy copyKey="legacy.206667f21607" />
        </Text>
      )}
      <View style={styles.card}>
        <Text style={styles.heading}>
          <LocalizedCopy copyKey="legacy.e1f23e263e5f" />
        </Text>
        <TextInput
          accessibilityLabel="Nome do Squad"
          placeholder="Nome do Squad"
          placeholderTextColor={colors.textMuted}
          value={squadName}
          onChangeText={setSquadName}
          maxLength={60}
          style={styles.input}
        />

        <Button
          label={create.isPending ? "Criando…" : "Criar Squad"}
          disabled={create.isPending || squadName.trim().length < 2}
          onPress={() => {
            if (creatingSquad.current) return;
            creatingSquad.current = true;
            create.mutate(
              { name: squadName, description: "" },
              {
                onSuccess: (id) => {
                  setSquadName("");
                  router.push(`/community/squads/${id}`);
                },
                onError: fail,
                onSettled: () => {
                  creatingSquad.current = false;
                },
              },
            );
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>
          <LocalizedCopy copyKey="legacy.0951616f8f0d" />
        </Text>
        <TextInput
          accessibilityLabel="Código de convite"
          autoCapitalize="characters"
          placeholder="Código"
          placeholderTextColor={colors.textMuted}
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          style={styles.input}
        />

        <Button
          label="Validar convite"
          disabled={!code.trim() || accept.isPending}
          onPress={() => {
            if (joiningSquad.current) return;
            joiningSquad.current = true;
            accept.mutate(code.trim().toUpperCase(), {
              onSuccess: (id) => {
                setCode("");
                router.push(`/community/squads/${id}`);
              },
              onError: fail,
              onSettled: () => {
                joiningSquad.current = false;
              },
            });
          }}
        />
      </View>
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
  success: { ...typography.label, color: colors.success },
  validation: { ...typography.caption, color: colors.danger },
  label: { ...typography.label, color: colors.text },
  profilePreview: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  profileInitials: { ...typography.heading, color: colors.primaryBright },
  status: { ...typography.caption, color: colors.primaryBright, marginTop: spacing.xs },
  visibility: { flexDirection: "row", gap: spacing.sm },
  choice: {
    flex: 1,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
  },
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
