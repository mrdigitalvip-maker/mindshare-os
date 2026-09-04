import { LocalizedCopy } from "@/components/localized-copy";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { ErrorState, LoadingState } from "@/components/screen-state";
import { useJourneyPacks } from "@/hooks/use-journey-packs";
import { colors, radius, spacing, typography } from "@/lib/theme";

const category = {
  creator: "CRIAÇÃO",
  business: "NEGÓCIOS",
  fitness: "BEM-ESTAR",
  study: "ESTUDOS",
  travel: "VIAGEM",
  personal: "PESSOAL",
} as const;
export default function PacksCatalog() {
  const packs = useJourneyPacks();
  if (packs.isPending) return <LoadingState title="Carregando programas…" />;
  if (packs.isError)
    return (
      <ErrorState
        title="Não foi possível carregar os programas."
        message="Verifique sua conexão. Nenhum dado foi inventado."
        actionLabel="Tentar novamente"
        onAction={() => void packs.refetch()}
      />
    );

  return (
    <AppScreen scroll contentContainerStyle={s.page}>
      <StandardHeader title="Journey Packs" />
      <Text style={s.promise}>
        <LocalizedCopy copyKey="legacy.1de4834d9ad6" />
      </Text>
      {packs.data?.length ? (
        packs.data.map((pack) => (
          <Pressable
            accessibilityRole="button"
            key={pack.id}
            style={s.card}
            onPress={() => router.push(`/packs/${pack.slug}`)}
          >
            <Text style={s.meta}>
              {category[pack.category]}
              {pack.durationDays ? ` · ${pack.durationDays} DIAS` : ""}
            </Text>
            <Text style={s.title}>{pack.title}</Text>
            <Text style={s.body}>{pack.shortDescription}</Text>
            <Text style={s.link}>
              <LocalizedCopy copyKey="legacy.531347bd4d4d" />
            </Text>
          </Pressable>
        ))
      ) : (
        <View style={s.card}>
          <Text style={s.title}>
            <LocalizedCopy copyKey="legacy.9ed8665593e5" />
          </Text>
          <Text style={s.body}>
            <LocalizedCopy copyKey="legacy.f78d4e6fd439" />
          </Text>
        </View>
      )}
    </AppScreen>
  );
}
const s = StyleSheet.create({
  page: { gap: spacing.md, paddingBottom: spacing.xxl },
  promise: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  meta: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  link: { ...typography.label, color: colors.primaryBright, marginTop: spacing.sm },
});
