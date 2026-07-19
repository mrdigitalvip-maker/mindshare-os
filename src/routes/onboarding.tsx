import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile, uploadAvatar } from "@/hooks/use-profile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullPageLoader } from "@/components/full-page-loader";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Welcome — NEXORA" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const STEPS = [
  { key: "name", title: "What should we call you?", hint: "Your full name, as you'd like to see it." },
  { key: "avatar", title: "Add a profile photo", hint: "Optional — you can always change this later." },
  { key: "language", title: "Choose your language", hint: "You can change this anytime." },
  { key: "country", title: "Where are you based?", hint: "Helps us tailor time and content to you." },
  { key: "goal", title: "What's your main goal with NEXORA?", hint: "Pick the one that fits best." },
  { key: "interests", title: "Anything else you're into?", hint: "Optional — pick as many as you like." },
] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

const COUNTRIES = [
  "Brazil", "Portugal", "United States", "United Kingdom", "Canada", "France",
  "Spain", "Germany", "Italy", "Mexico", "Argentina", "Chile", "Colombia",
  "Peru", "Uruguay", "Paraguay", "Bolivia", "Venezuela", "Ecuador",
  "Costa Rica", "Panama", "Guatemala", "Dominican Republic", "Cuba",
  "Angola", "Mozambique", "Cape Verde", "Guinea-Bissau",
  "São Tomé and Príncipe", "Equatorial Guinea", "East Timor",
  "Switzerland", "Belgium", "Netherlands", "Austria", "Ireland",
  "Australia", "New Zealand", "Japan", "South Korea", "China", "India",
  "South Africa", "Nigeria", "Egypt", "Morocco", "Senegal", "Ivory Coast",
  "Sweden", "Norway", "Denmark", "Finland", "Poland", "Greece", "Turkey",
  "United Arab Emirates", "Saudi Arabia", "Israel", "Singapore", "Other",
];

const PRIMARY_GOALS = [
  "Boost my productivity",
  "Manage projects",
  "Learn & study",
  "Track my finances",
  "Create content",
  "Translate & communicate",
  "Build AI agents",
  "Just exploring",
];

const INTERESTS = [
  "Productivity",
  "Projects",
  "Studies",
  "Finance",
  "Content creation",
  "Translation",
  "AI agents",
  "Automation",
];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "N"
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // 1) Not signed in → back to auth.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // 2) Already onboarded → straight to the Dashboard, no need to redo this.
  useEffect(() => {
    if (!profileLoading && profile?.onboarded) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [profileLoading, profile, navigate]);

  const detectedTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [country, setCountry] = useState("");
  const [goal, setGoal] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill name from the profile once it loads, without clobbering
  // whatever the user has already typed on this screen.
  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name);
  }, [profile?.full_name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading || profileLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated || profile?.onboarded) {
    // Redirect effects above are already in flight.
    return null;
  }

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

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (!user) return;
    setSubmitting(true);
    try {
      let avatar_url = profile?.avatar_url ?? undefined;
      if (avatarFile) {
        avatar_url = await uploadAvatar(user.id, avatarFile);
      }

      await updateProfile.mutateAsync({
        full_name: name.trim() || null,
        avatar_url: avatar_url ?? null,
        language,
        country: country || null,
        timezone: detectedTimezone,
        primary_goal: goal || null,
        preferences: { interests },
        onboarded: true,
      });

      toast.success("Welcome to NEXORA");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your profile");
    } finally {
      setSubmitting(false);
    }
  }

  const s = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;
  const canContinue =
    (s.key !== "name" || name.trim().length > 0) &&
    (s.key !== "country" || country.length > 0) &&
    (s.key !== "goal" || goal.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2">
          <img src="/nexora-icon.png" alt="" width={24} height={24} className="rounded" />
          <span className="font-display text-lg">NEXORA</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      <div className="mx-auto mt-6 h-1 w-full max-w-2xl overflow-hidden rounded-full bg-surface">
        <motion.div
          className="h-full bg-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="font-display text-4xl md:text-5xl">{s.title}</h1>
            <p className="mt-3 text-muted-foreground">{s.hint}</p>

            <div className="mt-10">
              {s.key === "name" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    autoFocus
                  />
                </div>
              )}

              {s.key === "avatar" && (
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-28 w-28 border border-border">
                    <AvatarImage src={avatarPreview ?? profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="font-display text-3xl">
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarSelected}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </Button>
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={removeAvatar}
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {s.key === "language" && (
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`rounded-xl border p-4 text-left transition ${
                        language === l.code
                          ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                          : "border-border bg-surface hover:border-foreground/20"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {l.code}
                      </p>
                      <p className="mt-1 font-medium">{l.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {s.key === "country" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-[color:var(--gold)]"
                    >
                      <option value="" disabled>
                        Select your country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Detected timezone: <span className="text-foreground">{detectedTimezone}</span>
                  </p>
                </div>
              )}

              {s.key === "goal" && (
                <div className="flex flex-wrap gap-2">
                  {PRIMARY_GOALS.map((g) => {
                    const active = goal === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}

              {s.key === "interests" && (
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((g) => {
                    const active = interests.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setInterests((prev) =>
                            prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                          )
                        }
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-foreground"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 pb-10">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          onClick={next}
          className="rounded-full px-6"
          disabled={submitting || !canContinue}
          aria-busy={submitting}
        >
          {submitting ? "Saving…" : step === STEPS.length - 1 ? "Enter NEXORA" : "Continue"}
          {!submitting && <ArrowRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
