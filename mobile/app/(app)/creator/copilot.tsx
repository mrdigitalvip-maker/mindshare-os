import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { CreatorButton, CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { creatorCopilotContext } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  loadCreatorProfile,
  loadCreatorStrategy,
  listCreatorAnalytics,
} from "@/services/creator-service";
export default function Copilot() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    if (session?.user.id)
      void Promise.all([
        loadCreatorProfile(session.user.id),
        loadCreatorStrategy(session.user.id),
        listCreatorAnalytics(session.user.id),
      ]).then(([profile, strategy, analytics]) =>
        setKeys(Object.keys(creatorCopilotContext({ profile, strategy, analytics }))),
      );
  }, [session?.user.id]);
  return (
    <CreatorPage title={t("creator.copilot")} description={t("creator.copilotHelp")}>
      <Text style={s.copy}>
        {keys.length
          ? t("creator.contextReady", { items: keys.join(", ") })
          : t("creator.noContext")}
      </Text>
      <CreatorButton
        label={t("creator.openAssistant")}
        onPress={() => router.push("/(app)/(tabs)/assistant")}
      />
    </CreatorPage>
  );
}
