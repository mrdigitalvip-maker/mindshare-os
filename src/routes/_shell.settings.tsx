import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, Lock, Globe, Palette, User, HelpCircle, LogOut, Crown, Info, Shield, Camera } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile, uploadAvatar } from "@/hooks/use-profile";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile?.full_name]);

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

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <ul className="space-y-1 text-sm">
            {[
              { icon: User, label: "Profile" },
              { icon: Palette, label: "Appearance" },
              { icon: Globe, label: "Language" },
              { icon: Bell, label: "Notifications" },
              { icon: Shield, label: "Privacy" },
              { icon: Lock, label: "Security" },
              { icon: Crown, label: "Plan" },
              { icon: HelpCircle, label: "Help" },
              { icon: Info, label: "About" },
            ].map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:bg-surface"
              >
                <s.icon className="h-4 w-4" /> {s.label}
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
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
            <Button className="mt-4 rounded-full" onClick={onSave} disabled={saving} aria-busy={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Section>

          <Section title="Notifications" description="Choose how NEXORA reaches you.">
            <Row label="Daily briefing" desc="Morning summary of your day.">
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </Row>
            <Row label="Goal reminders" desc="Nudges when you're drifting off-track.">
              <Switch defaultChecked />
            </Row>
          </Section>

          <Section title="Plan" description="Manage your NEXORA subscription.">
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="font-medium">Free plan</p>
                <p className="text-xs text-muted-foreground">Upgrade to unlock everything.</p>
              </div>
              <Link to="/premium">
                <Button size="sm" className="rounded-full">
                  <Crown className="mr-1 h-3.5 w-3.5" /> Upgrade
                </Button>
              </Link>
            </div>
          </Section>

          <Section title="Sign out" description="End this session on this device.">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
              }}
            >
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
