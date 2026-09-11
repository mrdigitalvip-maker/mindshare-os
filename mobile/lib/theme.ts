import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  background: "#05080F",
  canvasElevated: "#080D17",
  surface: "#0D1420",
  surfaceRaised: "#121C2A",
  overlay: "#182333",
  primary: "#00B8D9",
  primaryBright: "#52E5FF",
  blue: "#3B82F6",
  violet: "#8B7CF6",
  accentMuted: "#123344",
  text: "#F4F9FC",
  textSecondary: "#B4C2CF",
  textMuted: "#718293",
  textDisabled: "#4A5866",
  border: "#1C2A39",
  borderActive: "#28566B",
  focus: "#52E5FF",
  danger: "#FF7B86",
  success: "#54D6A0",
  warning: "#F6C76E",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const layout = {
  screenPadding: 16,
  screenTop: 8,
  sectionGap: 20,
  cardGap: 10,
  cardPadding: 16,
  controlHeight: 44,
  chipHeight: 42,
  headerHeight: 52,
  tabBarBaseHeight: 60,
  maxContentWidth: 720,
} as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const typography = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: "600" } satisfies TextStyle,
  title: { fontSize: 27, lineHeight: 33, fontWeight: "600" } satisfies TextStyle,
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "600" } satisfies TextStyle,
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" } satisfies TextStyle,
  label: { fontSize: 14, lineHeight: 19, fontWeight: "600" } satisfies TextStyle,
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "500" } satisfies TextStyle,
  eyebrow: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 2,
  } satisfies TextStyle,
} as const;
export const shadows = {
  raised: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  } satisfies ViewStyle,
  illuminated: {
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  } satisfies ViewStyle,
} as const;
export const effects = {
  focusGlow: "rgba(82, 229, 255, 0.22)",
  activeGlow: "rgba(0, 184, 217, 0.14)",
} as const;
export const motion = { quick: 160, standard: 260, calm: 420 } as const;
