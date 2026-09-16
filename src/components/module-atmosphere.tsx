import { useLocation } from "@tanstack/react-router";
import { useLanguage } from "@/providers/language-provider";

export function ModuleAtmosphere() {
  const location = useLocation();
  const { resolvedLocale } = useLanguage();
  const en = resolvedLocale === "en";
  const passport = location.pathname.startsWith("/passport");
  const creator = location.pathname.startsWith("/creator");

  // Passport now owns its guide inside the active lesson studio. Keeping a
  // second fixed Kivi card would duplicate the same action and cover content
  // on small screens.
  if (passport) return null;
  if (!creator) return null;

  const accent = passport ? "#62f5b0" : "#ff6bc9";
  const accent2 = passport ? "#5dd8ff" : "#8d7cff";
  // Creator Copilot lives inside the canonical /creator route, in the AI
  // section. Keep the CTA on a registered route instead of /creator/copilot,
  // which is not part of the router and previously produced a Not Found page.
  const destination = passport ? "/passport" : "/creator#ai";
  const title = passport ? "PASSPORT LIVE" : "CREATOR SIGNAL";
  const subtitle = passport
    ? en
      ? "Immersive learning layer"
      : "Camada imersiva de aprendizado"
    : en
      ? "Advanced creative workspace"
      : "Workspace criativo avançado";
  const agent = passport ? "Kivi Passport" : "Kivi Creator";
  const line = passport
    ? en
      ? "Ready for a real-world practice?"
      : "Pronto para uma prática de situação real?"
    : en
      ? "Let's turn your next idea into a stronger signal."
      : "Vamos transformar sua próxima ideia em um sinal mais forte.";
  const action = passport
    ? en
      ? "Open Passport"
      : "Abrir Passport"
    : en
      ? "Open Copilot"
      : "Abrir Copilot";

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="false">
      <div
        className="absolute -right-28 top-8 h-80 w-80 rounded-full blur-3xl"
        style={{ background: `${accent}18` }}
      />
      <div
        className="absolute -left-32 top-[38%] h-72 w-72 rounded-full blur-3xl"
        style={{ background: `${accent2}14` }}
      />

      <div className="absolute right-4 top-20 hidden items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-3 py-2.5 shadow-2xl backdrop-blur-xl md:flex">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <div>
          <div className="text-[10px] font-black tracking-[0.18em] text-white">{title}</div>
          <div className="text-[10px] text-white/45">{subtitle}</div>
        </div>
        <div className="ml-1 flex h-8 items-end gap-1">
          {[36, 68, 48, 88, 58].map((height, index) => (
            <span
              key={index}
              className="w-1 rounded-full"
              style={{ height: `${height}%`, background: index % 2 ? accent2 : accent }}
            />
          ))}
        </div>
      </div>

      <a
        href={destination}
        className="pointer-events-auto absolute bottom-24 right-3 flex w-[min(330px,calc(100vw-1.5rem))] items-center gap-3 rounded-3xl border bg-[#080b10]/95 p-3.5 shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 md:bottom-6 md:right-6"
        style={{ borderColor: `${accent}45` }}
      >
        <div
          className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border"
          style={{ borderColor: `${accent}55`, background: `${accent}12` }}
        >
          <div className="flex gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
            <span className="h-2 w-2 rounded-full" style={{ background: accent2 }} />
          </div>
          <span
            className="absolute bottom-3 h-1 w-5 rounded-full"
            style={{ background: `${accent}AA` }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white">{agent}</div>
          <div className="mt-1 text-[11px] leading-4 text-white/55">{line}</div>
          <div className="mt-1.5 text-[11px] font-bold" style={{ color: accent }}>
            {action} →
          </div>
        </div>
      </a>
    </div>
  );
}
