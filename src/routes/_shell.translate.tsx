import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Languages, ArrowRightLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TranslationService } from "@/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGS = [
  { code: "en", label: "English" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
];

export const Route = createFileRoute("/_shell/translate")({
  head: () => ({ meta: [{ title: "Translate — NEXORA" }] }),
  component: Translate,
});

function Translate() {
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("pt");
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!text.trim()) {
      setTranslated("");
      setIsTranslating(false);
      return;
    }
    setIsTranslating(true);
    const timer = window.setTimeout(() => {
      void TranslationService.translate(text, source, target)
        .then((result) => {
          if (!cancelled) setTranslated(result);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setTranslated("");
            toast.error(error instanceof Error ? error.message : "Translation failed");
          }
        })
        .finally(() => {
          if (!cancelled) setIsTranslating(false);
        });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, target, text]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Modules"
        title="Translate"
        description="Fluent multilingual translation, tuned to context."
      />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => {
            setSource(target);
            setTarget(source);
          }}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-40 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text to translate…"
          className="min-h-56 rounded-2xl bg-surface"
        />
        <div className="glass min-h-56 rounded-2xl p-4 text-sm text-muted-foreground">
          {isTranslating ? (
            <div className="flex min-h-48 items-center justify-center gap-2" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" /> Translating…
            </div>
          ) : translated ? (
            <div className="space-y-4 text-foreground">
              <p>
                <Languages className="mr-2 inline h-4 w-4 text-gold" />
                {translated}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(translated);
                    toast.success("Translation copied");
                  } catch {
                    toast.error("Translation could not be copied");
                  }
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          ) : (
            <p>Translation will appear here.</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
