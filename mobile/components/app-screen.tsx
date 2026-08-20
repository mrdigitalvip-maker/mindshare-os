import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, layout } from "@/lib/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  keyboard?: boolean;
  padded?: boolean;
  includeBottomInset?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

/** The single safe-area and width boundary for product screens. */
export function AppScreen({
  children,
  scroll = false,
  keyboard = false,
  padded = true,
  includeBottomInset = false,
  contentContainerStyle,
}: Props) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, padded && styles.padded, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={includeBottomInset ? ["top", "bottom"] : ["top"]} style={styles.safeArea}>
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: layout.maxContentWidth, alignSelf: "center" },
  padded: { paddingHorizontal: layout.screenPadding, paddingTop: layout.screenTop },
});
