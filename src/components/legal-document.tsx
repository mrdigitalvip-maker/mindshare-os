import { Link } from "@tanstack/react-router";
import { useState } from "react";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocumentProps = {
  titleEn: string;
  titlePt: string;
  summaryEn: string;
  summaryPt: string;
  updatedEn: string;
  updatedPt: string;
  sectionsEn: LegalSection[];
  sectionsPt: LegalSection[];
  relatedHref: "/privacy" | "/terms";
  relatedLabelEn: string;
  relatedLabelPt: string;
};

export function LegalDocument({
  titleEn,
  titlePt,
  summaryEn,
  summaryPt,
  updatedEn,
  updatedPt,
  sectionsEn,
  sectionsPt,
  relatedHref,
  relatedLabelEn,
  relatedLabelPt,
}: LegalDocumentProps) {
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const portuguese = language === "pt";
  const sections = portuguese ? sectionsPt : sectionsEn;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-512.png" alt="" width={28} height={28} className="rounded-md" />
            <span className="font-display text-xl tracking-tight">KIVRYN</span>
          </Link>
          <div className="flex items-center gap-2" aria-label="Language selection">
            <button
              type="button"
              onClick={() => setLanguage("pt")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                portuguese ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PT
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !portuguese ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">KIVRYN · Aether Systems</p>
        <h1 className="mt-4 font-display text-4xl md:text-6xl">{portuguese ? titlePt : titleEn}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          {portuguese ? summaryPt : summaryEn}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{portuguese ? updatedPt : updatedEn}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-border pt-8">
              <h2 className="font-display text-2xl">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-sm leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-border pt-8 text-sm">
          <Link to={relatedHref} className="rounded-full border border-border px-4 py-2 hover:bg-surface">
            {portuguese ? relatedLabelPt : relatedLabelEn}
          </Link>
          <Link to="/" className="rounded-full border border-border px-4 py-2 hover:bg-surface">
            {portuguese ? "Voltar ao KIVRYN" : "Back to KIVRYN"}
          </Link>
        </div>
      </main>
    </div>
  );
}
