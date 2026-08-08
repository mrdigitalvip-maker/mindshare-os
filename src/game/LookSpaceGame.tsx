import { useCallback, useEffect, useMemo, useState } from "react";
import { GameEngine } from "@/game/engine/core";
import { AstraOutpostScene } from "@/game/scenes/AstraOutpostScene";
import { GameHud } from "@/game/hud/GameHud";
import { MobileControls } from "@/game/controls/MobileControls";
import { raycastInteraction } from "@/game/interactions/raycast";
import { AURORA_I } from "@/game/entities/AuroraShip";
import { bootstrapCloudProfile } from "@/game/world/starbase/cloud-save";
import type { GamePhase, InteractionId, PlayerState } from "@/game/types";

const overlayCopy: Record<InteractionId, { eyebrow: string; title: string; body: string }> = {
  mission: {
    eyebrow: "MISSION NETWORK",
    title: "NO ACTIVE MISSIONS YET",
    body: "Long-range assignments unlock in the next flight certification.",
  },
  observation: {
    eyebrow: "OBSERVATION ARRAY",
    title: "EARTH ORBIT",
    body: "Altitude 408 km · Orbital sunrise in 00:17:42",
  },
  control: {
    eyebrow: "STATION CONTROL",
    title: "ASTRA OUTPOST ONLINE",
    body: "Life support nominal · Docking lanes synchronized",
  },
  "hangar-door": {
    eyebrow: "HANGAR ACCESS",
    title: "BAY DOOR CYCLING",
    body: "Authorized explorer clearance confirmed.",
  },
  ship: { eyebrow: "SHIP INSPECTION", title: AURORA_I.name, body: AURORA_I.class },
};
export default function LookSpaceGame() {
  const engine = useMemo(() => new GameEngine(), []),
    [phase, setPhase] = useState<GamePhase>("splash"),
    [progress, setProgress] = useState(0),
    [player, setPlayer] = useState<PlayerState>(engine.state),
    [saved, setSaved] = useState(0),
    [target, setTarget] = useState<InteractionId | null>(null),
    [overlay, setOverlay] = useState<InteractionId | null>(null),
    [locked, setLocked] = useState(false);
  const look = useCallback((x: number, y: number) => engine.look(x, y), [engine]);
  useEffect(() => {
    const off = [
      engine.bus.on("state", setPlayer),
      engine.bus.on("phase", setPhase),
      engine.bus.on("saved", setSaved),
      engine.bus.on("interaction", setTarget),
      engine.bus.on("prompt", setOverlay),
    ];
    engine.start();
    void bootstrapCloudProfile(engine);
    const splash = setTimeout(() => engine.setPhase("loading"), 900),
      loader = setInterval(
        () =>
          setProgress((n) => {
            const v = Math.min(100, n + 10);
            if (v === 100) engine.setPhase("ready");
            return v;
          }),
        120,
      );
    const key = (e: KeyboardEvent) => {
      if (e.code === "KeyV") engine.toggleCamera();
      if (e.code === "KeyE") engine.interact();
      if (e.code === "Escape" && engine.phase === "playing") engine.setPhase("paused");
    };
    addEventListener("keydown", key);
    return () => {
      off.forEach((fn) => fn());
      clearTimeout(splash);
      clearInterval(loader);
      removeEventListener("keydown", key);
      engine.stop();
    };
  }, [engine]);
  useEffect(() => {
    if (phase !== "playing") return;
    engine.setTarget(
      raycastInteraction(player.position, player.settings.yaw, player.settings.pitch),
    );
  }, [engine, phase, player.position, player.settings.pitch, player.settings.yaw]);
  const enter = () => {
    setOverlay(null);
    engine.setPhase("playing");
  };
  return (
    <main className="lookspace-game">
      <AstraOutpostScene player={player} onLook={look} onPointerLock={setLocked} />
      {phase !== "playing" && phase !== "paused" && (
        <div className={`game-entry phase-${phase}`}>
          <div className="orbit-logo">
            <i />
            <b>
              LOOK<span>SPACE</span>
            </b>
          </div>
          <p>ASTRA OUTPOST // EARTH ORBIT</p>
          {phase === "loading" && (
            <div className="telemetry">
              <span>PRESSURIZING SPAWN DECK</span>
              <div>
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>
                {progress}% · 3D WORLD {progress > 60 ? "READY" : "STREAMING"}
              </small>
            </div>
          )}
          {phase === "ready" && <button onClick={enter}>ENTER ASTRA OUTPOST</button>}
        </div>
      )}
      {(phase === "playing" || phase === "paused") && (
        <>
          <GameHud
            player={player}
            saved={saved}
            target={target}
            locked={locked}
            onCamera={() => engine.toggleCamera()}
          />
          <MobileControls
            onMove={(x, y) => engine.setMobile(x, y)}
            onLook={look}
            onInteract={() => engine.interact()}
            onMenu={() => engine.setPhase("paused")}
          />
        </>
      )}
      {overlay && phase === "playing" && (
        <section className="game-overlay">
          <button onClick={() => setOverlay(null)}>×</button>
          <small>{overlayCopy[overlay].eyebrow}</small>
          <h2>{overlayCopy[overlay].title}</h2>
          <p>{overlayCopy[overlay].body}</p>
          {overlay === "ship" && (
            <div className="ship-specs">
              <span>
                CLASS <b>{AURORA_I.class}</b>
              </span>
              <span>
                SPEED <b>{AURORA_I.speed}</b>
              </span>
              <span>
                RANGE <b>{AURORA_I.range}</b>
              </span>
              <span>
                SHIELD <b>{AURORA_I.shield}</b>
              </span>
              <span>
                STATUS <b>{AURORA_I.status}</b>
              </span>
              <button disabled>ENTER SHIP · FLIGHT SYSTEM OFFLINE</button>
            </div>
          )}
        </section>
      )}
      {phase === "paused" && (
        <div className="pause-menu">
          <small>SIMULATION SUSPENDED</small>
          <h2>ASTRA OUTPOST</h2>
          <button onClick={enter}>RESUME</button>
          <p>Position and camera telemetry saved locally.</p>
        </div>
      )}
    </main>
  );
}
