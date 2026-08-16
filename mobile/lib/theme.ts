import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  background: "#070A12",
  surface: "#101522",
  surfaceRaised: "#171D2D",
  primary: "#8B7CFF",
  primaryBright: "#B6AEFF",
  text: "#F6F7FB",
  textMuted: "#9BA4B8",
  border: "#293149",
  danger: "#FF6B7A",
  success: "#55D6A8",
  warning: "#F4C66A",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const typography = {
  title: { fontSize: 30, lineHeight: 36, fontWeight: "700" } satisfies TextStyle,
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "700" } satisfies TextStyle,
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" } satisfies TextStyle,
  label: { fontSize: 14, lineHeight: 19, fontWeight: "600" } satisfies TextStyle,
} as const;
export const shadows = {
  raised: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  } satisfies ViewStyle,
} as const;
export const motion = { quick: 160, standard: 260, calm: 420 } as const;
