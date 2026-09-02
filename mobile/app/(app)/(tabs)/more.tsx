import { StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "@/components/product-ui";
import { AppScreen } from "@/components/app-screen";
import { StandardHeader } from "@/components/product-ui";
import { colors, spacing, typography } from "@/lib/theme";
export default function More() {
  return (
    <AppScreen scroll contentContainerStyle={styles.page}>
      <StandardHeader title="Mais" />
      <Text style={styles.eyebrow}>MÓDULOS NEXORA</Text>
      <Text style={styles.title}>Seu espaço, além da rotina</Text>
      <Text style={styles.copy}>Continue sua execução ou cuide da sua experiência NEXORA.</Text>
      <ModuleGroup title="EXECUÇÃO">
        <ModuleCard
          icon="◇"
          title="Arena"
          description="Desafios reais conectados ao seu progresso."
          href="/arena"
        />
        <ModuleCard
          icon="◈"
          title="Jornadas"
          description="Programas, missões e próximos passos."
          href="/journeys"
        />
        <ModuleCard
          icon="◎"
          title="Estudos"
          description="Matérias, metas e sessões de foco."
          href="/studies"
        />
      </ModuleGroup>
      <ModuleGroup title="CONTA & NEXORA">
        <ModuleCard
          icon="◉"
          title="Community"
          description="Canais oficiais e seus Squads privados."
          href="/community"
        />
        <ModuleCard
          icon="✦"
          title="Premium"
          description="Conheça seu plano e benefícios."
          href="/premium"
        />
        <ModuleCard
          icon="⚙"
          title="Configurações"
          description="Conta, perfil, notificações e privacidade."
          href="/settings"
        />
      </ModuleGroup>
    </AppScreen>
  );
}
function ModuleGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.groupTitle}>
        {title}
      </Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { gap: spacing.sm, paddingBottom: spacing.lg },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  group: { gap: spacing.sm, marginTop: spacing.sm },
  groupTitle: { ...typography.eyebrow, color: colors.textMuted },
  grid: { gap: spacing.sm },
});
