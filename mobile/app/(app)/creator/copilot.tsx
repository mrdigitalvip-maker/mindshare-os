import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { CreatorButton, CreatorPage, creatorStyles as s } from "@/components/creator-workspace";
import { creatorAssistantPrompt, creatorCopilotContext } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import {
  loadCreatorProfile,
  loadCreatorStrategy,
  listCreatorAnalytics,
  listCreatorContent,
  listCreatorGoals,
  listCreatorManualSnapshots,
} from "@/services/creator-service";
const actions = ["plan", "profile", "ideas", "hooks", "analyze", "next"] as const;
export default function Copilot() {
  const { session } = useAuth(),
    { t } = useLanguage();
  const [context, setContext] = useState<ReturnType<typeof creatorCopilotContext>>({});
  useEffect(() => {
    if (session?.user.id)
      void Promise.all([
        loadCreatorProfile(session.user.id),
        loadCreatorStrategy(session.user.id),
        listCreatorAnalytics(session.user.id),
        listCreatorContent(session.user.id),
        listCreatorManualSnapshots(session.user.id),
        listCreatorGoals(session.user.id),
      ]).then(([profile, strategy, analytics, content, manualSnapshots, goals]) =>
        setContext(
          creatorCopilotContext({ profile, strategy, analytics, content, manualSnapshots, goals }),
        ),
      );
  }, [session?.user.id]);
  const open = (action: string) =>
    router.push({
      pathname: "/(app)/(tabs)/assistant-chat",
      params: { prompt: creatorAssistantPrompt(action, context) },
    });
  return (
    <CreatorPage title={t("creator.copilot")} description={t("creator.copilotHelp")}>
      <Text style={s.copy}>
        {Object.keys(context).length
          ? t("creator.contextReady", { items: Object.keys(context).join(", ") })
          : t("creator.noContext")}
      </Text>
      {actions.map((action) => (
        <CreatorButton
          key={action}
          label={t(`creator.copilotAction.${action}`)}
          onPress={() => open(action)}
        />
      ))}
    </CreatorPage>
  );
}
