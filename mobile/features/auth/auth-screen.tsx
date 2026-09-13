import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { Link, router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { presentAuthError } from "@/lib/auth-errors";
import { authCallbackUrl } from "@/lib/auth-links";
import { LEGAL_URLS } from "@/lib/legal";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme";
import { useLanguage } from "@/providers/language-provider";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const officialAppIcon = require("../../assets/branding/nexora-app-icon-master.png");

const copy = {
  "pt-BR": {
    eyebrow: "PERSONAL AI OPERATING SYSTEM",
    title: "Seu mundo.\nMais inteligente.",
    subtitle: "Entre no KIVRYN e continue de onde parou.",
    signupTitle: "Comece com o\nKIVRYN.",
    signupSubtitle: "Crie seu espaço pessoal e deixe o sistema trabalhar com você.",
    google: "Continuar com Google",
    divider: "ou entre com e-mail",
    name: "Nome",
    namePlaceholder: "Como podemos chamar você?",
    email: "E-mail",
    emailPlaceholder: "voce@exemplo.com",
    password: "Senha",
    passwordPlaceholder: "Sua senha",
    newPasswordPlaceholder: "Mínimo de 8 caracteres",
    show: "Mostrar",
    hide: "Ocultar",
    forgot: "Esqueci minha senha",
    signIn: "Entrar",
    create: "Criar conta",
    newHere: "Novo no KIVRYN?",
    createAction: "Criar conta",
    already: "Já tem uma conta?",
    signInAction: "Entrar",
    legalPrefix: "Ao continuar, você concorda com os ",
    terms: "Termos de Serviço",
    legalMiddle: " e a ",
    privacy: "Política de Privacidade",
    invalidEmail: "Informe um e-mail válido.",
    nameRequired: "Informe como você gostaria de ser chamado.",
    nameTooLong: "Use um nome com até 80 caracteres.",
    passwordRequired: "Informe sua senha.",
    passwordShort: "Crie uma senha com pelo menos 8 caracteres.",
    confirmation: "Confirmação enviada. Confira sua caixa de entrada e o spam.",
    resend: "Reenviar e-mail de confirmação",
    resendIn: "Reenviar em {seconds}s",
    resendSuccess: "Novo e-mail de confirmação solicitado.",
    secure: "Conexão protegida",
  },
  en: {
    eyebrow: "PERSONAL AI OPERATING SYSTEM",
    title: "Your world.\nSmarter.",
    subtitle: "Sign in to KIVRYN and continue where you left off.",
    signupTitle: "Start with\nKIVRYN.",
    signupSubtitle: "Create your personal space and let the system work with you.",
    google: "Continue with Google",
    divider: "or sign in with email",
    name: "Name",
    namePlaceholder: "What should we call you?",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    newPasswordPlaceholder: "At least 8 characters",
    show: "Show",
    hide: "Hide",
    forgot: "Forgot password?",
    signIn: "Sign in",
    create: "Create account",
    newHere: "New to KIVRYN?",
    createAction: "Create account",
    already: "Already have an account?",
    signInAction: "Sign in",
    legalPrefix: "By continuing, you agree to the ",
    terms: "Terms of Service",
    legalMiddle: " and ",
    privacy: "Privacy Policy",
    invalidEmail: "Enter a valid email address.",
    nameRequired: "Tell us what you would like to be called.",
    nameTooLong: "Use a name with up to 80 characters.",
    passwordRequired: "Enter your password.",
    passwordShort: "Create a password with at least 8 characters.",
    confirmation: "Confirmation sent. Check your inbox and spam folder.",
    resend: "Resend confirmation email",
    resendIn: "Resend in {seconds}s",
    resendSuccess: "A new confirmation email was requested.",
    secure: "Protected connection",
  },
} as const;

function GoogleMark() {
  return (
    <Svg accessibilityLabel="Google" width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.09-1.92 3.27-4.76 3.27-8.1Z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.87 0-5.3-1.94-6.17-4.55H2.14v2.84A11 11 0 0 0 12 23Z" />
      <Path fill="#FBBC05" d="M5.83 14.09A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.35-2.09V7.07H2.14A11 11 0 0 0 1 12c0 1.78.43 3.46 1.14 4.93l3.69-2.84Z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.56 10.56 0 0 0 12 1a11 11 0 0 0-9.86 6.07l3.69 2.84C6.7 7.3 9.13 5.38 12 5.38Z" />
    </Svg>
  );
}

function KivrynMark() {
  return (
    <View style={styles.markShell}>
      <Image source={officialAppIcon} resizeMode="cover" style={styles.markImage} />
    </View>
  );
}

export function AuthScreen() {
  const { resolvedLocale } = useLanguage();
  const text = copy[resolvedLocale];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<"form" | "google" | null>(null);
  const [message, setMessage] = useState<string>();
  const [confirmationAccepted, setConfirmationAccepted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [focusedField, setFocusedField] = useState<"name" | "email" | "password" | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const submitLock = useRef(false);
  const googleLock = useRef(false);
  const resendLock = useRef(false);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = setInterval(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function submit() {
    if (submitLock.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!hasSupabaseConfig) return setMessage(presentAuthError(null, "CONFIGURATION").message);
    if (!emailPattern.test(normalizedEmail)) return setMessage(text.invalidEmail);
    if (mode === "signup" && !name.trim()) return setMessage(text.nameRequired);
    if (mode === "signup" && name.trim().length > 80) return setMessage(text.nameTooLong);
    if (password.length < (mode === "signup" ? 8 : 1)) return setMessage(mode === "signup" ? text.passwordShort : text.passwordRequired);

    submitLock.current = true;
    setBusy("form");
    setMessage(undefined);
    try {
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: { emailRedirectTo: authCallbackUrl, data: { full_name: name.trim() } },
          });
      if (result.error) throw result.error;
      if (result.data.session && result.data.user) router.replace("/");
      else {
        setConfirmationAccepted(true);
        setMessage(text.confirmation);
      }
    } catch (error) {
      setMessage(presentAuthError(error).message);
    } finally {
      submitLock.current = false;
      setBusy(null);
    }
  }

  async function resendConfirmation() {
    if (resendLock.current || resendCooldown) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) return setMessage(text.invalidEmail);
    resendLock.current = true;
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: normalizedEmail, options: { emailRedirectTo: authCallbackUrl } });
      if (error) throw error;
      setResendCooldown(60);
      setMessage(text.resendSuccess);
    } catch (error) {
      setMessage(presentAuthError(error).message);
    } finally {
      resendLock.current = false;
    }
  }

  async function google() {
    if (googleLock.current) return;
    if (!hasSupabaseConfig) return setMessage(presentAuthError(null, "CONFIGURATION").message);
    googleLock.current = true;
    setBusy("google");
    setMessage(undefined);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authCallbackUrl, skipBrowserRedirect: true } });
      if (error) throw error;
      if (!data.url) throw new Error("missing provider URL");
      await Linking.openURL(data.url);
    } catch (error) {
      setMessage(presentAuthError(error, "AUTH_PROVIDER").message);
    } finally {
      googleLock.current = false;
      setBusy(null);
    }
  }

  const isSignup = mode === "signup";
  const switchMode = () => {
    setMode(isSignup ? "login" : "signup");
    setMessage(undefined);
    setConfirmationAccepted(false);
    setPassword("");
    requestAnimationFrame(() => (isSignup ? emailRef.current?.focus() : undefined));
  };

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientSide} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <KivrynMark />
              <View>
                <Text style={styles.brand}>KIVRYN</Text>
                <Text style={styles.eyebrow}>{text.eyebrow}</Text>
              </View>
            </View>
            <Text accessibilityRole="header" style={styles.title}>{isSignup ? text.signupTitle : text.title}</Text>
            <Text style={styles.subtitle}>{isSignup ? text.signupSubtitle : text.subtitle}</Text>
          </View>

          <View style={styles.authPanel}>
            <Pressable accessibilityRole="button" accessibilityLabel={text.google} accessibilityState={{ disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => void google()} style={({ pressed }) => [styles.google, pressed && !busy && styles.buttonPressed]}>
              {busy === "google" ? <ActivityIndicator color={colors.text} /> : <GoogleMark />}
              <Text style={styles.googleText}>{text.google}</Text>
            </Pressable>

            <View style={styles.separator}><View style={styles.line} /><Text style={styles.separatorText}>{text.divider}</Text><View style={styles.line} /></View>

            <View style={styles.form}>
              {isSignup && (
                <Field label={text.name} focused={focusedField === "name"}>
                  <TextInput autoCapitalize="words" autoComplete="name" maxLength={80} returnKeyType="next" onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} onSubmitEditing={() => emailRef.current?.focus()} value={name} onChangeText={setName} style={styles.input} placeholder={text.namePlaceholder} placeholderTextColor={colors.textMuted} />
                </Field>
              )}

              <Field label={text.email} focused={focusedField === "email"}>
                <TextInput ref={emailRef} autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="next" onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} onSubmitEditing={() => passwordRef.current?.focus()} value={email} onChangeText={setEmail} style={styles.input} placeholder={text.emailPlaceholder} placeholderTextColor={colors.textMuted} />
              </Field>

              <Field label={text.password} focused={focusedField === "password"}>
                <View style={styles.password}>
                  <TextInput ref={passwordRef} autoCapitalize="none" autoComplete={isSignup ? "new-password" : "current-password"} secureTextEntry={!visible} returnKeyType="done" onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} onSubmitEditing={() => void submit()} value={password} onChangeText={setPassword} style={[styles.input, styles.passwordInput]} placeholder={isSignup ? text.newPasswordPlaceholder : text.passwordPlaceholder} placeholderTextColor={colors.textMuted} />
                  <Pressable accessibilityRole="button" accessibilityLabel={visible ? text.hide : text.show} onPress={() => setVisible(!visible)} style={styles.eye}><Text style={styles.eyeText}>{visible ? text.hide : text.show}</Text></Pressable>
                </View>
              </Field>

              {!isSignup && <View style={styles.forgotRow}><Link accessibilityRole="link" href="/auth/recovery" style={styles.forgotLink}>{text.forgot}</Link></View>}

              {message && <View style={styles.messageBox}><View style={styles.messageDot} /><Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text></View>}

              {isSignup && confirmationAccepted ? (
                <Pressable accessibilityRole="button" disabled={resendCooldown > 0} onPress={() => void resendConfirmation()} style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>{resendCooldown > 0 ? text.resendIn.replace("{seconds}", String(resendCooldown)) : text.resend}</Text>
                </Pressable>
              ) : null}

              <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => void submit()} style={({ pressed }) => [styles.primary, Boolean(busy) && styles.buttonDisabled, pressed && !busy && styles.primaryPressed]}>
                {busy === "form" ? <ActivityIndicator color="#001116" /> : <Text style={styles.primaryText}>{isSignup ? text.create : text.signIn}</Text>}
              </Pressable>

              <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={switchMode} style={styles.switchButton}>
                <Text style={styles.switchMuted}>{isSignup ? text.already : text.newHere} </Text>
                <Text style={styles.switchStrong}>{isSignup ? text.signInAction : text.createAction}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.secureRow}><View style={styles.secureDot} /><Text style={styles.secureText}>{text.secure}</Text></View>
            <View accessibilityRole="text" style={styles.legalRow}>
              <Text style={styles.legal}>{text.legalPrefix}</Text>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(LEGAL_URLS.termsOfService)}><Text style={styles.legalLink}>{text.terms}</Text></Pressable>
              <Text style={styles.legal}>{text.legalMiddle}</Text>
              <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(LEGAL_URLS.privacyPolicy)}><Text style={styles.legalLink}>{text.privacy}</Text></Pressable>
              <Text style={styles.legal}>.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, focused, children }: { label: string; focused: boolean; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text><View style={[styles.fieldShell, focused && styles.fieldShellFocused]}>{children}</View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#03070D" },
  keyboard: { flex: 1 },
  ambientTop: { position: "absolute", top: -170, right: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: "rgba(19, 130, 170, 0.12)" },
  ambientSide: { position: "absolute", top: 240, left: -210, width: 380, height: 380, borderRadius: 190, backgroundColor: "rgba(91, 66, 190, 0.07)" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingTop: spacing.xl, paddingBottom: spacing.lg },
  hero: { width: "100%", maxWidth: 440, alignSelf: "center", marginBottom: 28 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 34 },
  markShell: { width: 50, height: 50, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(82, 229, 255, 0.18)", backgroundColor: colors.surface, ...shadows.illuminated },
  markImage: { width: "100%", height: "100%" },
  brand: { color: colors.text, fontSize: 18, lineHeight: 21, fontWeight: "800", letterSpacing: 4.3 },
  eyebrow: { marginTop: 3, color: colors.textMuted, fontSize: 8, lineHeight: 11, fontWeight: "700", letterSpacing: 1.45 },
  title: { color: colors.text, fontSize: 42, lineHeight: 46, fontWeight: "700", letterSpacing: -1.6, maxWidth: 390 },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 14, maxWidth: 365, lineHeight: 24 },
  authPanel: { width: "100%", maxWidth: 440, alignSelf: "center", padding: 18, borderRadius: 24, borderWidth: 1, borderColor: "rgba(92, 125, 150, 0.18)", backgroundColor: "rgba(8, 14, 23, 0.9)", ...shadows.raised },
  google: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderColor: "rgba(155, 180, 199, 0.2)", borderRadius: 15, backgroundColor: "rgba(16, 25, 37, 0.92)" },
  googleText: { ...typography.label, color: colors.text, fontSize: 15 },
  separator: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: "rgba(92, 125, 150, 0.16)" },
  separatorText: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  form: { gap: 14 },
  field: { gap: 7 },
  label: { ...typography.label, color: colors.textSecondary, fontSize: 12, letterSpacing: 0.25 },
  labelFocused: { color: colors.primaryBright },
  fieldShell: { minHeight: 54, justifyContent: "center", borderRadius: 15, borderWidth: 1, borderColor: "rgba(92, 125, 150, 0.2)", backgroundColor: "rgba(6, 12, 20, 0.94)" },
  fieldShellFocused: { borderColor: "rgba(82, 229, 255, 0.62)", backgroundColor: "rgba(7, 18, 27, 0.98)" },
  input: { ...typography.body, minHeight: 52, paddingHorizontal: 15, color: colors.text, backgroundColor: "transparent", borderWidth: 0 },
  password: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 84 },
  eye: { position: "absolute", right: 4, minWidth: 74, minHeight: 44, alignItems: "center", justifyContent: "center" },
  eyeText: { ...typography.caption, color: colors.primaryBright, fontWeight: "700" },
  forgotRow: { alignItems: "flex-end", marginTop: -2 },
  forgotLink: { ...typography.label, color: colors.textSecondary, fontSize: 12, paddingVertical: 3 },
  messageBox: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(246, 199, 110, 0.16)", backgroundColor: "rgba(246, 199, 110, 0.055)" },
  messageDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: colors.warning },
  message: { ...typography.caption, flex: 1, color: colors.textSecondary, lineHeight: 18 },
  primary: { minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: 16, marginTop: 2, backgroundColor: colors.primaryBright, shadowColor: colors.primaryBright, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  primaryPressed: { transform: [{ scale: 0.992 }], opacity: 0.92 },
  primaryText: { ...typography.label, color: "#001116", fontSize: 15, fontWeight: "800", letterSpacing: 0.15 },
  buttonPressed: { opacity: 0.74 },
  buttonDisabled: { opacity: 0.62 },
  secondaryAction: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  secondaryActionText: { ...typography.caption, color: colors.primaryBright },
  switchButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  switchMuted: { ...typography.label, color: colors.textMuted, fontSize: 13 },
  switchStrong: { ...typography.label, color: colors.primaryBright, fontSize: 13 },
  footer: { width: "100%", maxWidth: 440, alignSelf: "center", alignItems: "center", marginTop: 20, gap: 9 },
  secureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  secureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  secureText: { ...typography.caption, color: colors.textMuted, fontSize: 10, letterSpacing: 0.35 },
  legalRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10 },
  legal: { ...typography.caption, color: colors.textDisabled, textAlign: "center", fontSize: 10, lineHeight: 15 },
  legalLink: { ...typography.caption, color: colors.textMuted, fontSize: 10, lineHeight: 15, textDecorationLine: "underline" },
});
