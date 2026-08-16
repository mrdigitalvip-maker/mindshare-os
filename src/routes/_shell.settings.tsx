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

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({ meta: [{ title: "Settings — NEXORA" }] }),
  component: Settings,
});

function initials(name?: string | null) {
  if (!name) return "N";
  return name.trim()[0]?.toUpperCase() ?? "N";
}

function Settings() {
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
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
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
      if (avatarFile) {
        avatar_url = await uploadAvatar(user.id, avatarFile);
      }
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
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Account" title="Settings" description="Personalize your NEXORA." />

      <div className="mt-8 mx-auto max-w-4xl space-y-6">
        <Section title="Profile" description="Update your public info.">
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
                Change photo
              </Button>
              <p className="text-xs text-muted-foreground">JPG or PNG, up to 5MB.</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <Label htmlFor="proactive-reminders">Proactive NEXORA reminders</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Allow the assistant to surface relevant follow-ups. Browser delivery is managed
                  below.
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
              <Label>Name</Label>
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
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Section>

        <Section title="Notifications" description="Choose useful, local-time reminders.">
          <NotificationSettings />
        </Section>

        <Section title="AI & Usage" description="Real backend usage and daily entitlements.">
          <UsageSettings />
        </Section>

        <Section title="Plan" description="Manage your NEXORA subscription.">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="font-medium">
                {subscription.isLoading
                  ? "Checking plan…"
                  : subscription.data?.status === "trialing"
                    ? "Premium trial"
                    : subscription.data?.isPremium
                      ? "Premium plan"
                      : subscription.data?.status === "canceled"
                        ? "Canceled plan"
                        : "Free plan"}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscription.data?.isPremium
                  ? "Your subscription is active."
                  : "Upgrade to unlock everything."}
              </p>
            </div>
            {!subscription.data?.isPremium && (
              <Link to="/premium">
                <Button size="sm" className="rounded-full">
                  <Crown className="mr-1 h-3.5 w-3.5" /> Upgrade
                </Button>
              </Link>
            )}
          </div>
        </Section>

        <Section title="Data & History" description="Control your Assistant conversation data.">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-medium">Assistant retention</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {subscription.data?.isPremium
                ? "Your chat history is retained without a time limit while Premium is active."
                : "Chat history is retained for 30 days."}
            </p>
            {(subscription.data?.cancelAtPeriodEnd ||
              (!subscription.data?.isPremium && subscription.data?.status)) && (
              <p className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                When Premium ends, conversations older than 30 days become eligible for permanent
                deletion. Deleted history cannot be recovered.
              </p>
            )}
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              if (
                !window.confirm(
                  "Permanently delete all Assistant conversations? This cannot be undone.",
                )
              )
                return;
              try {
                await AIService.clearHistory();
                toast.success("Assistant history deleted");
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Couldn't delete Assistant history",
                );
              }
            }}
          >
            <TrashHistoryIcon /> Clear Assistant history
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            This action only removes Assistant conversations and messages. Projects, tasks,
            documents, studies, finances, agents, files, and settings are not affected.
          </p>
        </Section>

        <Section title="Privacy & Legal" description="Review NEXORA's public legal policies.">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            <LegalLink label="Privacy Policy" href={LEGAL_URLS.privacyPolicy} />
            <LegalLink label="Terms of Service" href={LEGAL_URLS.termsOfService} />
          </div>
        </Section>

        <Section title="Sign out" description="End this session on this device.">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              try {
                await signOut();
                navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn't sign out");
              }
            }}
          >
            <LogOut className="mr-1 h-4 w-4" /> Sign out
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
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
