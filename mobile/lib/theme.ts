import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  background: "#070706",
  surface: "#11110F",
  surfaceRaised: "#1A1916",
  primary: "#B9854B",
  primaryBright: "#E3B978",
  accentMuted: "#4B3520",
  text: "#F5F2EC",
  textMuted: "#99968F",
  border: "#2B2924",
  danger: "#D77B76",
  success: "#7EAA8D",
  warning: "#D5A45D",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const typography = {
  display: { fontSize: 42, lineHeight: 48, fontWeight: "600" } satisfies TextStyle,
  title: { fontSize: 30, lineHeight: 36, fontWeight: "700" } satisfies TextStyle,
  heading: { fontSize: 24, lineHeight: 30, fontWeight: "600" } satisfies TextStyle,
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" } satisfies TextStyle,
  label: { fontSize: 14, lineHeight: 19, fontWeight: "600" } satisfies TextStyle,
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "500" } satisfies TextStyle,
  eyebrow: { fontSize: 12, lineHeight: 17, fontWeight: "700", letterSpacing: 2 } satisfies TextStyle,
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
