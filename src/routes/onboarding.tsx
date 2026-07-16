import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("nexora.session");
    if (!raw) throw redirect({ to: "/auth", search: { mode: "signup" } });
  },
  head: () => ({ meta: [{ title: "Welcome — NEXORA" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const STEPS = [
  { key: "name", title: "What should we call you?", hint: "Just a first name works." },
  { key: "profession", title: "What do you do?", hint: "Optional — helps us tune suggestions." },
  { key: "goals", title: "What do you want from NEXORA?", hint: "Pick anything that fits." },
  { key: "language", title: "Choose your language", hint: "You can change this anytime." },
] as const;

const GOALS = [
  "Get more focused",
  "Ship a project",
  "Learn something new",
  "Write better content",
  "Manage money",
  "Translate & communicate",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [profession, setProfession] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");

  function next() {
    if (step === STEPS.length - 1) {
      updateUser({ name, onboarded: true });
      try {
        localStorage.setItem(
          "nexora.preferences",
          JSON.stringify({ profession, goals, language }),
        );
      } catch {}
      navigate({ to: "/dashboard" });
      return;
    }
    setStep((s) => s + 1);
  }

  const s = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

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
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex"
                    autoFocus
                  />
                </div>
              )}
              {s.key === "profession" && (
                <div className="space-y-2">
                  <Label htmlFor="prof">Profession</Label>
                  <Input
                    id="prof"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    placeholder="Designer, student, founder…"
                    autoFocus
                  />
                </div>
              )}
              {s.key === "goals" && (
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => {
                    const active = goals.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setGoals((prev) =>
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
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 pb-10">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={next} className="rounded-full px-6">
          {step === STEPS.length - 1 ? "Enter NEXORA" : "Continue"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
