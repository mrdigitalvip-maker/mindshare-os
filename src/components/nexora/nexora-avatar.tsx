import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NexoraPersona = "nova" | "atlas" | "lyra" | "orion";
export type NexoraAvatarState =
  "idle" | "listening" | "thinking" | "speaking" | "attention" | "success" | "quiet";

/** Provider-neutral facial data. ElevenLabs, Rive, video and WebGL adapters can all feed this. */
export type NexoraPerformance = {
  amplitude?: number;
  mouthOpen?: number;
  viseme?: string;
};

export type NexoraRendererProps = NexoraPerformance & {
  persona: NexoraPersona;
  state: NexoraAvatarState;
  compact: boolean;
  priority: boolean;
  onLoad(): void;
  onError(): void;
};

type PersonaDefinition = {
  name: string;
  descriptor: string;
  premium: boolean;
  position: string;
};

export const NOVA_ASSET_MISSING = "NOVA_ASSET_MISSING" as const;

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

function StaticPersonaRenderer({
  persona,
  compact,
  priority,
  onLoad,
  onError,
}: NexoraRendererProps) {
  const root = `/nexora/personas/${persona}`;
  return (
    <picture className="nexora-avatar__media">
      <source
        type="image/avif"
        srcSet={`${root}/${persona}-640.avif 640w, ${root}/${persona}-960.avif 960w`}
        sizes={compact ? "160px" : "(max-width: 767px) 72vw, 420px"}
      />
      <source
        type="image/webp"
        srcSet={`${root}/${persona}-640.webp 640w, ${root}/${persona}-960.webp 960w`}
        sizes={compact ? "160px" : "(max-width: 767px) 72vw, 420px"}
      />
      <img
        src={`${root}/${persona}.png`}
        width="640"
        height="800"
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  );
}

export function NexoraAvatar({
  persona = "nova",
  state = "idle",
  compact = false,
  amplitude = 0,
  mouthOpen,
  viseme,
  priority = false,
  renderer,
  className,
}: NexoraPerformance & {
  persona?: NexoraPersona;
  state?: NexoraAvatarState;
  compact?: boolean;
  priority?: boolean;
  renderer?: (props: NexoraRendererProps) => ReactNode;
  className?: string;
}) {
  const [assetStatus, setAssetStatus] = useState<"loading" | "loaded" | "missing">("loading");
  const definition = NEXORA_PERSONAS[persona];
  useEffect(() => setAssetStatus("loading"), [persona, renderer]);
  const debugState =
    import.meta.env.DEV && typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("nexoraState") as NexoraAvatarState | null)
      : null;
  const activeState =
    debugState &&
    ["idle", "listening", "thinking", "speaking", "attention", "success", "quiet"].includes(
      debugState,
    )
      ? debugState
      : state;
  const debugAmplitude =
    import.meta.env.DEV && typeof window !== "undefined"
      ? Number(new URLSearchParams(window.location.search).get("nexoraAmplitude"))
      : Number.NaN;
  const level = Math.min(
    1,
    Math.max(0, Number.isFinite(debugAmplitude) ? debugAmplitude : amplitude),
  );
  const style = {
    "--nexora-amplitude": level,
    "--nexora-mouth": mouthOpen ?? level,
    "--nexora-position": definition.position,
  } as CSSProperties;
  const rendererProps: NexoraRendererProps = {
    persona,
    state: activeState,
    compact,
    priority,
    amplitude: level,
    mouthOpen,
    viseme,
    onLoad: () => setAssetStatus("loaded"),
    onError: () => setAssetStatus("missing"),
  };

  return (
    <figure
      className={cn(
        "nexora-avatar",
        `is-${activeState}`,
        `is-${persona}`,
        compact && "is-compact",
        assetStatus === "missing" && "has-fallback",
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      <div className="nexora-avatar__environment" />
      <div className="nexora-avatar__aura" />
      {assetStatus !== "missing" &&
        (renderer ? renderer(rendererProps) : <StaticPersonaRenderer {...rendererProps} />)}
      {assetStatus === "missing" && (
        <div
          className="nexora-avatar__fallback"
          data-error={persona === "nova" ? NOVA_ASSET_MISSING : "PERSONA_ASSET_MISSING"}
        >
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
      {import.meta.env.DEV && (
        <output className="nexora-avatar__debug">
          persona={persona} assetLoaded={assetStatus === "loaded" ? "true" : assetStatus} state=
          {activeState} amplitude={level.toFixed(2)}
        </output>
      )}
    </figure>
  );
}
