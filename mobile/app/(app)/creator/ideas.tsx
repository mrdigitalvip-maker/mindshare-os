import { useState } from "react";
import { router } from "expo-router";
import { CreatorButton, CreatorField, CreatorPage } from "@/components/creator-workspace";
import { creatorAssistantPrompt } from "@/lib/creator";
import { useLanguage } from "@/providers/language-provider";
export default function ContentIdeas() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ niche: "", platform: "", goal: "", pillar: "", format: "" });
  return (
    <CreatorPage title={t("creator.contentIdeas")} description={t("creator.realAiOnly")}>
      {Object.keys(form).map((key) => (
        <CreatorField
          key={key}
          label={t(`creator.idea.${key}`)}
          value={form[key as keyof typeof form]}
          onChangeText={(value) => setForm((x) => ({ ...x, [key]: value }))}
        />
      ))}
      <CreatorButton
        label={t("creator.generate")}
        disabled={!form.niche.trim()}
        onPress={() =>
          router.push({
            pathname: "/(app)/(tabs)/assistant-chat",
            params: {
              prompt: creatorAssistantPrompt(
                "Generate structured content ideas (ideas, rationale, format, CTA).",
                { ideaRequest: form },
              ),
            },
          })
        }
      />
    </CreatorPage>
  );
}
