import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Languages, ArrowRightLeft } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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

  return (
    <PageShell>
      <PageHeader eyebrow="Modules" title="Translate" description="Fluent multilingual translation, tuned to context." />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40 rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => { setSource(target); setTarget(source); }}
        >
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className="w-40 rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
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
          {text ? (
            <p className="text-foreground">
              <Languages className="mr-2 inline h-4 w-4 text-gold" />
              Translation appears here once the AI provider is connected.
            </p>
          ) : (
            <p>Translation will appear here.</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
