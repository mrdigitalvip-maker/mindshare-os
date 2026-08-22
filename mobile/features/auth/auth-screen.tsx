import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { Link, router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { presentAuthError } from "@/lib/auth-errors";
import { authCallbackUrl } from "@/lib/auth-links";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/lib/theme";
import { ensureAuthenticatedProfile } from "@/services/profile-service";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function GoogleMark() {
  return <Svg accessibilityLabel="Google" width={20} height={20} viewBox="0 0 24 24"><Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.09-1.92 3.27-4.76 3.27-8.1Z"/><Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.87 0-5.3-1.94-6.17-4.55H2.14v2.84A11 11 0 0 0 12 23Z"/><Path fill="#FBBC05" d="M5.83 14.09A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.43.35-2.09V7.07H2.14A11 11 0 0 0 1 12c0 1.78.43 3.46 1.14 4.93l3.69-2.84Z"/><Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.56 10.56 0 0 0 12 1a11 11 0 0 0-9.86 6.07l3.69 2.84C6.7 7.3 9.13 5.38 12 5.38Z"/></Svg>;
}

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState<"form" | "google" | null>(null); const [message, setMessage] = useState<string>();
  const passwordRef = useRef<TextInput>(null);
  async function finish(user: Parameters<typeof ensureAuthenticatedProfile>[0]) { const profile = await ensureAuthenticatedProfile(user); router.replace(profile.onboarded ? "/dashboard" : "/onboarding"); }
  async function submit() {
    if (busy) return; const normalizedEmail = email.trim();
    if (!hasSupabaseConfig) return setMessage(presentAuthError(null, "CONFIGURATION").message);
    if (!emailPattern.test(normalizedEmail)) return setMessage("Informe um e-mail válido.");
    if (mode === "signup" && !name.trim()) return setMessage("Informe como você gostaria de ser chamado.");
    if (password.length < (mode === "signup" ? 8 : 1)) return setMessage(mode === "signup" ? "Crie uma senha com pelo menos 8 caracteres." : "Informe sua senha.");
    setBusy("form"); setMessage(undefined);
    try {
      const result = mode === "login" ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password }) : await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: authCallbackUrl, data: { full_name: name.trim() } } });
      if (result.error) throw result.error;
      if (result.data.session && result.data.user) await finish(result.data.user); else setMessage("Enviamos um link de confirmação. Confira seu e-mail para concluir sua conta.");
    } catch (error) { setMessage(presentAuthError(error).message); } finally { setBusy(null); }
  }
  async function google() {
    if (busy) return; if (!hasSupabaseConfig) return setMessage(presentAuthError(null, "CONFIGURATION").message);
    setBusy("google"); setMessage(undefined);
    try { const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: authCallbackUrl, skipBrowserRedirect: true } }); if (error) throw error; if (!data.url) throw new Error("missing provider URL"); await Linking.openURL(data.url); }
    catch (error) { setMessage(presentAuthError(error, "AUTH_PROVIDER").message); } finally { setBusy(null); }
  }
  const isSignup = mode === "signup";
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View><Text style={styles.brand}>N E X O R A</Text><Text accessibilityRole="header" style={styles.title}>{isSignup ? "Crie seu espaço NEXORA." : "Seu espaço começa aqui."}</Text><Text style={styles.copy}>Organize. Execute. Avance.</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Continuar com Google" accessibilityState={{ disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => void google()} style={styles.google}>{busy === "google" ? <ActivityIndicator color={colors.text}/> : <GoogleMark/>}<Text style={styles.googleText}>Continuar com Google</Text></Pressable>
    <View style={styles.separator}><View style={styles.line}/><Text style={styles.separatorText}>ou continue com</Text><View style={styles.line}/></View>
    <View style={styles.form}>{isSignup && <Field label="Nome"><TextInput autoCapitalize="words" autoComplete="name" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} value={name} onChangeText={setName} style={styles.input} placeholder="Seu nome" placeholderTextColor={colors.textMuted}/></Field>}
      <Field label="E-mail"><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} value={email} onChangeText={setEmail} style={styles.input} placeholder="voce@exemplo.com" placeholderTextColor={colors.textMuted}/></Field>
      <Field label="Senha"><View style={styles.password}><TextInput ref={passwordRef} autoCapitalize="none" autoComplete={isSignup ? "new-password" : "current-password"} secureTextEntry={!visible} returnKeyType="done" onSubmitEditing={() => void submit()} value={password} onChangeText={setPassword} style={[styles.input, styles.passwordInput]} placeholder={isSignup ? "Mínimo de 8 caracteres" : "Sua senha"} placeholderTextColor={colors.textMuted}/><Pressable accessibilityRole="button" accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"} onPress={() => setVisible(!visible)} style={styles.eye}><Text style={styles.eyeText}>{visible ? "Ocultar" : "Mostrar"}</Text></Pressable></View></Field>
      {message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(busy) }} disabled={Boolean(busy)} onPress={() => void submit()} style={({pressed}) => [styles.primary, pressed && styles.pressed]}>{busy === "form" ? <ActivityIndicator color={colors.background}/> : <Text style={styles.primaryText}>{isSignup ? "Criar conta" : "Entrar"}</Text>}</Pressable>
      {!isSignup && <Link accessibilityRole="link" href="/auth/recovery" style={styles.link}>Esqueci minha senha</Link>}
      <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => { setMode(isSignup ? "login" : "signup"); setMessage(undefined); }}><Text style={styles.switch}>{isSignup ? "Já tem uma conta? Entrar" : "Ainda não tem conta? Criar conta"}</Text></Pressable>
    </View><Text style={styles.legal}>Termos de Uso e Política de Privacidade estarão disponíveis antes do lançamento.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
function Field({label, children}:{label:string; children:React.ReactNode}) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
const styles=StyleSheet.create({page:{flex:1,backgroundColor:colors.background},content:{flexGrow:1,justifyContent:"center",gap:spacing.lg,paddingHorizontal:spacing.lg,paddingVertical:spacing.xl},brand:{...typography.eyebrow,color:colors.primaryBright,letterSpacing:5,marginBottom:spacing.xl},title:{...typography.display,color:colors.text,maxWidth:360},copy:{...typography.body,color:colors.textMuted,marginTop:spacing.sm},google:{minHeight:54,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:spacing.md,borderWidth:1,borderColor:"#484640",borderRadius:radius.md,backgroundColor:colors.surfaceRaised},googleText:{...typography.label,color:colors.text},separator:{flexDirection:"row",alignItems:"center",gap:spacing.md},line:{flex:1,height:1,backgroundColor:colors.border},separatorText:{...typography.caption,color:colors.textMuted},form:{gap:spacing.md},field:{gap:spacing.sm},label:{...typography.label,color:colors.text},input:{...typography.body,minHeight:52,paddingHorizontal:spacing.md,color:colors.text,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},password:{position:"relative",justifyContent:"center"},passwordInput:{paddingRight:88},eye:{position:"absolute",right:4,minWidth:76,minHeight:44,alignItems:"center",justifyContent:"center"},eyeText:{...typography.caption,color:colors.primaryBright},message:{...typography.label,color:colors.warning},primary:{minHeight:54,alignItems:"center",justifyContent:"center",borderRadius:radius.md,backgroundColor:colors.primaryBright},primaryText:{...typography.label,color:colors.background,fontSize:16},pressed:{opacity:.8},link:{...typography.label,color:colors.primaryBright,textAlign:"center",padding:spacing.sm},switch:{...typography.label,color:colors.text,textAlign:"center",padding:spacing.sm},legal:{...typography.caption,color:colors.textMuted,textAlign:"center"}});
