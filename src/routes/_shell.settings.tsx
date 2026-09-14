import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogOut, Crown, Camera, Database, ExternalLink } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile, uploadAvatar } from "@/hooks/use-profile";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/use-subscription";
import { AIService } from "@/services";
import { NotificationSettings, UsageSettings } from "@/components/settings-engagement";
import { LEGAL_URLS } from "@/lib/legal";
import { useLanguage } from "@/providers/language-provider";
import type { LanguagePreference } from "@/i18n";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({ meta: [{ title: "Settings — KIVRYN" }] }),
  component: Settings,
});

function initials(name?: string | null) {
  if (!name) return "N";
  return name.trim()[0]?.toUpperCase() ?? "N";
}

function Settings() {
  const { languagePreference, resolvedLocale, setLanguagePreference, t } = useLanguage();
  const en = resolvedLocale === "en";
  const c = (pt: string, english: string) => (en ? english : pt);
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const subscription = useSubscription();

  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [proactiveReminders, setProactiveReminders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
    const preferences = profile?.preferences as Record<string, unknown> | undefined;
    setProactiveReminders(preferences?.proactive_reminders === true);
  }, [profile?.full_name, profile?.preferences]);

  function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(c("Escolha um arquivo de imagem.", "Please choose an image file."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(c("A imagem deve ter menos de 5 MB.", "Image must be under 5MB."));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSave() {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url ?? undefined;
      if (avatarFile) avatar_url = await uploadAvatar(user.id, avatarFile);
      await updateProfile.mutateAsync({
        full_name: name.trim() || null,
        avatar_url: avatar_url ?? null,
        preferences: {
          ...(profile?.preferences ?? {}),
          proactive_reminders: proactiveReminders,
        },
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success(c("Perfil atualizado.", "Profile updated."));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : c("Não foi possível atualizar seu perfil.", "Couldn't update your profile."),
      );
    } finally {
      setSaving(false);
    }
  }

  const planLabel = subscription.isLoading
    ? c("Verificando plano…", "Checking plan…")
    : subscription.data?.status === "trialing"
      ? c("Teste Premium", "Premium trial")
      : subscription.data?.isPremium
        ? c("Plano Premium", "Premium plan")
        : subscription.data?.status === "canceled"
          ? c("Plano cancelado", "Canceled plan")
          : c("Plano gratuito", "Free plan");

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("settings.account")}
        title={t("page.settings.title")}
        description={t("page.settings.description")}
      />

      <div className="mt-8 mx-auto max-w-4xl space-y-6">
        <Section title={t("settings.language")} description={t("settings.languageHelp")}>
          <div
            className="grid gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label={t("settings.language")}
          >
            {(
              [
                [
                  "system",
                  t("language.resolved", {
                    language:
                      resolvedLocale === "pt-BR" ? t("language.portuguese") : t("language.english"),
                  }),
                ],
                ["pt-BR", t("language.portuguese")],
                ["en", t("language.english")],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={languagePreference === value}
                onClick={() => setLanguagePreference(value as LanguagePreference)}
                className={`min-h-12 rounded-xl px-4 py-3 text-left text-sm transition ${languagePreference === value ? "bg-primary text-primary-foreground shadow-lg" : "bg-surface hover:bg-surface-elevated"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title={c("Perfil", "Profile")}
          description={c("Atualize suas informações públicas.", "Update your public info.")}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={avatarPreview ?? profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-xl">{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarSelected}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2 h-3.5 w-3.5" />
                {c("Trocar foto", "Change photo")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {c("JPG ou PNG, até 5 MB.", "JPG or PNG, up to 5MB.")}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="proactive-reminders">
                  {c("Lembretes proativos da KIVRYN", "Proactive KIVRYN reminders")}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c(
                    "Permita que o assistente mostre acompanhamentos relevantes. A entrega no navegador é gerenciada abaixo.",
                    "Allow the assistant to surface relevant follow-ups. Browser delivery is managed below.",
                  )}
                </p>
              </div>
              <Switch
                id="proactive-reminders"
                checked={proactiveReminders}
                onCheckedChange={setProactiveReminders}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{c("Nome", "Name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly disabled />
            </div>
          </div>
          <Button
            className="mt-4 rounded-full"
            onClick={onSave}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? c("Salvando…", "Saving…") : c("Salvar alterações", "Save changes")}
          </Button>
        </Section>

        <Section
          title={c("Notificações", "Notifications")}
          description={c("Escolha lembretes úteis no seu horário local.", "Choose useful, local-time reminders.")}
        >
          <NotificationSettings />
        </Section>

        <Section
          title={c("IA e uso", "AI & Usage")}
          description={c("Uso real do backend e permissões diárias.", "Real backend usage and daily entitlements.")}
        >
          <UsageSettings />
        </Section>

        <Section
          title={c("Plano", "Plan")}
          description={c("Gerencie sua assinatura KIVRYN.", "Manage your KIVRYN subscription.")}
        >
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="font-medium">{planLabel}</p>
              <p className="text-xs text-muted-foreground">
                {subscription.data?.isPremium
                  ? c("Sua assinatura está ativa.", "Your subscription is active.")
                  : c("Faça upgrade para desbloquear tudo.", "Upgrade to unlock everything.")}
              </p>
            </div>
            {!subscription.data?.isPremium && (
              <Link to="/premium">
                <Button size="sm" className="rounded-full">
                  <Crown className="mr-1 h-3.5 w-3.5" /> {c("Fazer upgrade", "Upgrade")}
                </Button>
              </Link>
            )}
          </div>
        </Section>

        <Section
          title={c("Dados e histórico", "Data & History")}
          description={c(
            "Controle os dados das conversas do Assistente.",
            "Control your Assistant conversation data.",
          )}
        >
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium">{c("Retenção do Assistente", "Assistant retention")}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {subscription.data?.isPremium
                ? c(
                    "Seu histórico de conversas é mantido sem limite de tempo enquanto o Premium estiver ativo.",
                    "Your chat history is retained without a time limit while Premium is active.",
                  )
                : c("O histórico de conversas é mantido por 30 dias.", "Chat history is retained for 30 days.")}
            </p>
            {(subscription.data?.cancelAtPeriodEnd ||
              (!subscription.data?.isPremium && subscription.data?.status)) && (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                {c(
                  "Quando o Premium termina, conversas com mais de 30 dias podem ser excluídas permanentemente. Histórico excluído não pode ser recuperado.",
                  "When Premium ends, conversations older than 30 days become eligible for permanent deletion. Deleted history cannot be recovered.",
                )}
              </p>
            )}
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                !window.confirm(
                  c(
                    "Excluir permanentemente todas as conversas do Assistente? Esta ação não pode ser desfeita.",
                    "Permanently delete all Assistant conversations? This cannot be undone.",
                  ),
                )
              )
                return;
              try {
                await AIService.clearHistory();
                toast.success(c("Histórico do Assistente excluído.", "Assistant history deleted."));
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : c(
                        "Não foi possível excluir o histórico do Assistente.",
                        "Couldn't delete Assistant history.",
                      ),
                );
              }
            }}
          >
            <TrashHistoryIcon /> {c("Limpar histórico do Assistente", "Clear Assistant history")}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            {c(
              "Esta ação remove apenas conversas e mensagens do Assistente. Projetos, tarefas, documentos, estudos, finanças, agentes, arquivos e configurações não são afetados.",
              "This action only removes Assistant conversations and messages. Projects, tasks, documents, studies, finances, agents, files, and settings are not affected.",
            )}
          </p>
        </Section>

        <Section
          title={c("Privacidade e legal", "Privacy & Legal")}
          description={c("Revise as políticas públicas da KIVRYN.", "Review KIVRYN's public legal policies.")}
        >
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            <LegalLink label={c("Política de Privacidade", "Privacy Policy")} href={LEGAL_URLS.privacyPolicy} />
            <LegalLink label={c("Termos de Serviço", "Terms of Service")} href={LEGAL_URLS.termsOfService} />
          </div>
        </Section>

        <Section
          title={c("Sair", "Sign out")}
          description={c("Encerre esta sessão neste dispositivo.", "End this session on this device.")}
        >
          <Button
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              try {
                await signOut();
                navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : c("Não foi possível sair.", "Couldn't sign out."),
                );
              }
            }}
          >
            <LogOut className="mr-1 h-4 w-4" /> {c("Sair", "Sign out")}
          </Button>
        </Section>
      </div>
    </PageShell>
  );
}

function LegalLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center justify-between gap-4 px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {label}
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}

function TrashHistoryIcon() {
  return <Database className="mr-1 h-4 w-4" aria-hidden="true" />;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="v2-surface rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <span className="h-4 w-0.5 rounded-full bg-intelligence" aria-hidden="true" />
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
