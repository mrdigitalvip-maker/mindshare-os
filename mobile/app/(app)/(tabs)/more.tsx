import { StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "@/components/product-ui";
import { colors, spacing, typography } from "@/lib/theme";
export default function More() {
  return (
    <View style={styles.page}>
      <Text style={styles.eyebrow}>MÓDULOS NEXORA</Text>
      <Text style={styles.title}>Mais possibilidades.</Text>
      <Text style={styles.copy}>Acesse os módulos disponíveis no seu espaço.</Text>
      <View style={styles.grid}>
        <ModuleCard
          icon="◎"
          title="Estudos"
          description="Matérias, metas, sessões e notas."
          href="/studies"
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
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.background },
  eyebrow: { ...typography.eyebrow, color: colors.primaryBright },
  title: { ...typography.title, color: colors.text },
  copy: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  grid: { gap: spacing.md },
});
