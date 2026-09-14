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
const officialAppIcon = require("../../assets/branding/kivryn-app-icon.png");

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
                <View style={styles.field}>
                  <Text style={styles.label}>{text.name}</Text>
                  <TextInput value={name} onChangeText={setName} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} placeholder={text.namePlaceholder} placeholderTextColor={colors.textMuted} style={[styles.input, focusedField === "name" && styles.inputFocused]} maxLength={80} autoCapitalize="words" />
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>{text.email}</Text>
                <TextInput ref={emailRef} value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} placeholder={text.emailPlaceholder} placeholderTextColor={colors.textMuted} style={[styles.input, focusedField === "email" && styles.inputFocused]} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{text.password}</Text>
                <View style={[styles.passwordShell, focusedField === "password" && styles.inputFocused]}>
                  <TextInput ref={passwordRef} value={password} onChangeText={setPassword} secureTextEntry={!visible} textContentType={isSignup ? "newPassword" : "password"} autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => void submit()} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} placeholder={isSignup ? text.newPasswordPlaceholder : text.passwordPlaceholder} placeholderTextColor={colors.textMuted} style={styles.passwordInput} />
                  <Pressable accessibilityRole="button" onPress={() => setVisible((value) => !value)} hitSlop={10}>
                    <Text style={styles.visibility}>{visible ? text.hide : text.show}</Text>
                  </Pressable>
                </View>
                {!isSignup ? <Link href="/auth/forgot-password" style={styles.forgot}>{text.forgot}</Link> : null}
              </View>

              {message ? <View style={[styles.message, confirmationAccepted && styles.messageSuccess]}><Text style={styles.messageText}>•  {message}</Text></View> : null}

              <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => void submit()} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.buttonPressed]}>
                {busy === "form" ? <ActivityIndicator color="#041014" /> : <Text style={styles.primaryText}>{isSignup ? text.create : text.signIn}</Text>}
              </Pressable>

              {confirmationAccepted ? (
                <Pressable disabled={Boolean(resendCooldown) || resendLock.current} onPress={() => void resendConfirmation()} style={styles.resendButton}>
                  <Text style={styles.resendText}>{resendCooldown ? text.resendIn.replace("{seconds}", String(resendCooldown)) : text.resend}</Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable accessibilityRole="button" onPress={switchMode} style={styles.switch}>
              <Text style={styles.switchMuted}>{isSignup ? text.already : text.newHere} </Text>
              <Text style={styles.switchAction}>{isSignup ? text.signInAction : text.createAction}</Text>
            </Pressable>
          </View>

          <Text style={styles.legal}>{text.legalPrefix}<Text style={styles.legalLink} onPress={() => void Linking.openURL(LEGAL_URLS.terms)}>{text.terms}</Text>{text.legalMiddle}<Text style={styles.legalLink} onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>{text.privacy}</Text>.</Text>
          <View style={styles.secure}><View style={styles.secureDot} /><Text style={styles.secureText}>{text.secure}</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#02050A" },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 26, justifyContent: "center" },
  ambientTop: { position: "absolute", top: -130, right: -80, width: 360, height: 360, borderRadius: 999, backgroundColor: "#06243A", opacity: 0.64 },
  ambientSide: { position: "absolute", bottom: 150, left: -150, width: 320, height: 320, borderRadius: 999, backgroundColor: "#0A1730", opacity: 0.4 },
  hero: { marginBottom: 28 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 32 },
  markShell: { width: 48, height: 48, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#18425A", backgroundColor: "#071019", ...shadows.raised },
  markImage: { width: "100%", height: "100%" },
  brand: { color: colors.text, fontSize: 23, fontWeight: "800", letterSpacing: 3 },
  eyebrow: { color: "#8DA3B3", fontSize: 10, fontWeight: "800", letterSpacing: 2.4, marginTop: 2 },
  title: { color: "#F6F9FB", fontSize: 42, lineHeight: 47, fontWeight: "800", letterSpacing: -1.8 },
  subtitle: { color: "#A7B1BB", fontSize: 16, lineHeight: 24, fontWeight: "500", marginTop: 13, maxWidth: 470 },
  authPanel: { padding: 20, borderRadius: 28, borderWidth: 1, borderColor: "#152330", backgroundColor: "#071018", ...shadows.raised },
  google: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: "#203242", backgroundColor: "#101B26", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 12 },
  googleText: { color: "#F6F9FB", fontSize: 16, fontWeight: "700" },
  separator: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: "#17232D" },
  separatorText: { color: "#687685", fontSize: 13, fontWeight: "600" },
  form: { gap: 17 },
  field: { gap: 8 },
  label: { color: "#D6DEE5", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 56, borderRadius: 17, borderWidth: 1, borderColor: "#1B2A38", backgroundColor: "#050B11", color: "#F4F7F9", paddingHorizontal: 16, fontSize: 16 },
  inputFocused: { borderColor: "#55D8F5", shadowColor: "#30CFF0", shadowOpacity: 0.18, shadowRadius: 8 },
  passwordShell: { minHeight: 56, borderRadius: 17, borderWidth: 1, borderColor: "#1B2A38", backgroundColor: "#050B11", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  passwordInput: { flex: 1, minHeight: 54, color: "#F4F7F9", fontSize: 16 },
  visibility: { color: "#55D8F5", fontSize: 13, fontWeight: "800" },
  forgot: { color: "#B8C3CD", fontSize: 13, fontWeight: "700", alignSelf: "flex-end", marginTop: 2 },
  message: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: "#4B4030", backgroundColor: "#1A1815", justifyContent: "center", paddingHorizontal: 15 },
  messageSuccess: { borderColor: "#1E5647", backgroundColor: "#0D211C" },
  messageText: { color: "#C7CFD6", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  primary: { minHeight: 58, borderRadius: 18, backgroundColor: "#55D8F5", alignItems: "center", justifyContent: "center", marginTop: 2, shadowColor: "#38CDEB", shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  primaryText: { color: "#041014", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
  resendButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  resendText: { color: "#7FDFF4", fontSize: 13, fontWeight: "700" },
  switch: { minHeight: 48, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 18 },
  switchMuted: { color: "#7E8A96", fontSize: 14, fontWeight: "600" },
  switchAction: { color: "#55D8F5", fontSize: 14, fontWeight: "800" },
  legal: { color: "#687685", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 20, paddingHorizontal: 10 },
  legalLink: { color: "#B9C5CF", textDecorationLine: "underline" },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14 },
  secureDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: "#52E0A0" },
  secureText: { color: "#788794", fontSize: 11, fontWeight: "700" },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
});
