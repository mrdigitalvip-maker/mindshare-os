import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRightLeft, Copy, Languages, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TranslationService } from "@/services";

const MAX_CHARACTERS = 12_000;
const LANGS = [
  { code: "auto", label: "Detect language" },
  { code: "en", label: "English" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
];

export const Route = createFileRoute("/_shell/translate")({
  head: () => ({ meta: [{ title: "Translate — NEXORA" }] }),
  component: Translate,
});

function Translate() {
  const [source, setSource] = useState("auto");
  const [target, setTarget] = useState("pt");
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  async function translate() {
    const input = text.trim();
    if (!input || isTranslating) return;
    if (source === target) {
      setError("Choose two different languages.");
      return;
    }
    setError("");
    setIsTranslating(true);
    try {
      const result = await TranslationService.translate(input, source, target);
      setTranslated(result);
      toast.success("Translation saved to your history");
    } catch (cause) {
      setTranslated("");
      setError(cause instanceof Error ? cause.message : "Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  }

  function swapLanguages() {
    if (source === "auto") {
      setSource(target);
      setTarget("en");
    } else {
      setSource(target);
      setTarget(source);
    }
    if (translated) {
      setText(translated);
      setTranslated(text);
    }
    setError("");
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Language workspace"
        title="Translate"
        description="Translate with the configured AI provider. Results are persisted only after a successful response."
      />

      <section
        className="mt-8 overflow-hidden rounded-3xl border bg-card shadow-sm"
        aria-label="Translator"
      >
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/20 p-4 sm:px-6">
          <Select value={source} onValueChange={setSource} disabled={isTranslating}>
            <SelectTrigger className="min-h-11 w-[calc(50%-2rem)] min-w-36 flex-1 rounded-xl sm:max-w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 rounded-full"
            onClick={swapLanguages}
            disabled={isTranslating}
            aria-label="Swap languages"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <Select value={target} onValueChange={setTarget} disabled={isTranslating}>
            <SelectTrigger className="min-h-11 w-[calc(50%-2rem)] min-w-36 flex-1 rounded-xl sm:max-w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.filter((language) => language.code !== "auto").map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 md:divide-x">
          <div className="flex min-h-72 flex-col p-4 sm:p-6">
            <Textarea
              aria-label="Text to translate"
              value={text}
              maxLength={MAX_CHARACTERS}
              disabled={isTranslating}
              onChange={(event) => {
                setText(event.target.value);
                setError("");
              }}
              placeholder="Type or paste text to translate…"
              className="min-h-52 flex-1 resize-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:ring-0"
            />
            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
              <span className="text-xs tabular-nums text-muted-foreground">
                {text.length.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
              </span>
              <Button
                className="min-h-11 min-w-32"
                disabled={!text.trim() || source === target || isTranslating}
                onClick={() => void translate()}
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Translating…
                  </>
                ) : (
                  <>
                    <Languages />
                    Translate
                  </>
                )}
              </Button>
            </div>
          </div>
          <div
            className="min-h-72 bg-muted/10 p-4 sm:p-6"
            aria-live="polite"
            aria-busy={isTranslating}
          >
            {isTranslating ? (
              <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" />
                Contacting translation provider…
              </div>
            ) : error ? (
              <div
                className="flex min-h-56 flex-col items-center justify-center text-center"
                role="alert"
              >
                <p className="font-medium text-destructive">Translation unavailable</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => void translate()}>
                  <RotateCcw />
                  Try again
                </Button>
              </div>
            ) : translated ? (
              <div className="flex min-h-56 flex-col">
                <p className="flex-1 whitespace-pre-wrap break-words text-base leading-7">
                  {translated}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 min-h-11 self-end"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(translated);
                      toast.success("Translation copied");
                    } catch {
                      toast.error("Translation could not be copied");
                    }
                  }}
                >
                  <Copy />
                  Copy result
                </Button>
              </div>
            ) : (
              <div className="flex min-h-56 items-center justify-center text-center text-sm text-muted-foreground">
                Your provider response will appear here.
              </div>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
