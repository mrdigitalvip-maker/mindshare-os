import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import type { CreatorGoal } from "@/lib/creator";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { listCreatorGoals, saveCreatorGoal } from "@/services/creator-service";
export default function Goals() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<CreatorGoal[]>([]);
  const [title, setTitle] = useState("");
  const load = () =>
    session?.user.id ? listCreatorGoals(session.user.id).then(setData) : Promise.resolve();
  useEffect(() => {
    if (session?.user.id) void listCreatorGoals(session.user.id).then(setData);
  }, [session?.user.id]);
  return (
    <CreatorPage title={t("creator.goals")} description={t("creator.goalsHelp")}>
      <CreatorField label={t("creator.goalTitle")} value={title} onChangeText={setTitle} />
      <CreatorButton
        label={t("common.create")}
        disabled={!title.trim()}
        onPress={() => {
          if (session?.user.id)
            void saveCreatorGoal(session.user.id, { title, milestones: [] }).then(() => {
              setTitle("");
              return load();
            });
        }}
      />
      {data.map((goal) => (
        <View style={s.card} key={goal.id}>
          <Text style={s.heading}>{goal.title}</Text>
          {goal.milestones.map((m) => (
            <CreatorButton
              key={m.id}
              label={`${m.completed ? "✓ " : ""}${m.label}`}
              onPress={() => {
                if (session?.user.id)
                  void saveCreatorGoal(session.user.id, {
                    ...goal,
                    milestones: goal.milestones.map((x) =>
                      x.id === m.id ? { ...x, completed: !x.completed } : x,
                    ),
                  }).then(load);
              }}
            />
          ))}
          <Text style={s.copy}>{t("creator.manualProgress")}</Text>
        </View>
      ))}
    </CreatorPage>
  );
}
