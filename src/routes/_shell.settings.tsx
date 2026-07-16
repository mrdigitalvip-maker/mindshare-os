import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Lock, Globe, Palette, User, HelpCircle, LogOut, Crown, Info, Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({ meta: [{ title: "Settings — NEXORA" }] }),
  component: Settings,
});

function Settings() {
  const { user, updateUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [notifications, setNotifications] = useState(true);

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
            <div className="grid gap-4 sm:grid-cols-2">
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
              onClick={() => {
                updateUser({ name });
                toast.success("Profile updated");
              }}
            >
              Save changes
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
