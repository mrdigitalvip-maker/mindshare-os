import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type NexoraPersona = "nova" | "atlas" | "lyra" | "orion";
export type NexoraAvatarState =
  "idle" | "listening" | "thinking" | "speaking" | "attention" | "success" | "quiet";

type PersonaDefinition = {
  name: string;
  descriptor: string;
  premium: boolean;
  position: string;
};

export const NEXORA_PERSONAS: Record<NexoraPersona, PersonaDefinition> = {
  nova: {
    name: "NOVA",
    descriptor: "Elegante · calorosa · confiante",
    premium: false,
    position: "50% 18%",
  },
  atlas: {
    name: "ATLAS",
    descriptor: "Calmo · direto · estratégico",
    premium: false,
    position: "50% 18%",
  },
  lyra: {
    name: "LYRA",
    descriptor: "Expressiva · criativa · intuitiva",
    premium: true,
    position: "50% 16%",
  },
  orion: {
    name: "ORION",
    descriptor: "Sofisticado · contemplativo · executivo",
    premium: true,
    position: "50% 18%",
  },
};

export function NexoraAvatar({
  persona = "nova",
  state = "idle",
  compact = false,
  amplitude = 0,
  priority = false,
  className,
}: {
  persona?: NexoraPersona;
  state?: NexoraAvatarState;
  compact?: boolean;
  amplitude?: number;
  priority?: boolean;
  className?: string;
}) {
  const [assetFailed, setAssetFailed] = useState(false);
  const definition = NEXORA_PERSONAS[persona];
  const level = Math.min(1, Math.max(0, amplitude));
  const style = {
    "--nexora-amplitude": level,
    "--nexora-position": definition.position,
  } as CSSProperties;

  return (
    <figure
      className={cn(
        "nexora-avatar",
        `is-${state}`,
        `is-${persona}`,
        compact && "is-compact",
        assetFailed && "has-fallback",
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      <div className="nexora-avatar__environment" />
      <div className="nexora-avatar__aura" />
      {!assetFailed && (
        <picture className="nexora-avatar__media">
          <source
            type="image/avif"
            srcSet={`/nexora/personas/${persona}/presence-640.avif 640w, /nexora/personas/${persona}/presence-960.avif 960w`}
            sizes={compact ? "160px" : "(max-width: 767px) 72vw, 420px"}
          />
          <source
            type="image/webp"
            srcSet={`/nexora/personas/${persona}/presence-640.webp 640w, /nexora/personas/${persona}/presence-960.webp 960w`}
            sizes={compact ? "160px" : "(max-width: 767px) 72vw, 420px"}
          />
          <img
            src={`/nexora/personas/${persona}/presence-640.webp`}
            width="640"
            height="800"
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={() => setAssetFailed(true)}
          />
        </picture>
      )}
      {assetFailed && (
        <div className="nexora-avatar__fallback">
          <span className="nexora-avatar__monogram">{definition.name.slice(0, 1)}</span>
          <span className="nexora-avatar__fallback-name">{definition.name}</span>
        </div>
      )}
      <div className="nexora-avatar__voice" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="nexora-avatar__status" />
    </figure>
  );
}
