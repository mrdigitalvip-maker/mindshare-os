import { useState } from "react";
import { Text } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CreatorButton,
  CreatorField,
  CreatorPage,
  creatorStyles as s,
} from "@/components/creator-workspace";
import { decideCreatorImport, recognizeCreatorUrl } from "@/lib/creator";
import { useLanguage } from "@/providers/language-provider";
export default function MediaImport() {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState("");
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"] });
    if (!result.canceled) setSelected(result.assets[0]?.fileName ?? result.assets[0]?.uri ?? "");
  }
  const intent = url ? recognizeCreatorUrl(url) : null;
  return (
    <CreatorPage title={t("creator.mediaImport")} description={t("creator.importHelp")}>
      <CreatorButton label={t("creator.selectVideo")} onPress={() => void pick()} />
      {selected ? <Text style={s.copy}>{selected}</Text> : null}
      <CreatorField label={t("creator.pasteUrl")} value={url} onChangeText={setUrl} />
      {intent?.valid ? <Text style={s.copy}>{t("creator.uploadOriginal")}</Text> : null}
      <CreatorButton
        label={t("creator.authorizedConnection")}
        disabled={!decideCreatorImport("authorized_platform").canImport}
        onPress={() => undefined}
      />
      <Text style={s.copy}>{t("creator.oauthFuture")}</Text>
    </CreatorPage>
  );
}
