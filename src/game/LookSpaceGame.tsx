import { useEffect, useMemo, useState } from "react";
import { GameEngine } from "@/game/engine/core";
import { SpaceCanvas } from "@/game/world/SpaceCanvas";
import { GameHud } from "@/game/hud/GameHud";
import { MobileControls } from "@/game/controls/MobileControls";
import type { GamePhase, PlayerState } from "@/game/types";

export default function LookSpaceGame() {
  const engine = useMemo(() => new GameEngine(), []);
  const [phase, setPhase] = useState<GamePhase>("splash");
  const [progress, setProgress] = useState(0);
  const [player, setPlayer] = useState<PlayerState>(engine.state);
  const [saved, setSaved] = useState(0);
  const [prompt, setPrompt] = useState<string | null>(null);
  useEffect(() => {
    const off = [
      engine.bus.on("state", setPlayer),
      engine.bus.on("phase", setPhase),
      engine.bus.on("saved", setSaved),
      engine.bus.on("prompt", setPrompt),
    ];
    engine.start();
    const splash = setTimeout(() => engine.setPhase("loading"), 1800);
    const loader = setInterval(
      () =>
        setProgress((n) => {
          const next = Math.min(100, n + 4 + Math.random() * 9);
          if (next === 100) engine.setPhase("ready");
          return next;
        }),
      180,
    );
    const key = (e: KeyboardEvent) => {
      if (e.code === "KeyV") engine.toggleCamera();
      if (e.code === "KeyE") engine.interact();
      if (e.code === "Escape" && engine.phase === "playing") engine.setPhase("paused");
    };
    window.addEventListener("keydown", key);
    return () => {
      off.forEach((fn) => fn());
      clearTimeout(splash);
      clearInterval(loader);
      window.removeEventListener("keydown", key);
      engine.stop();
    };
  }, [engine]);
  const enter = () => engine.setPhase("playing");
  return (
    <main className="lookspace-game">
      <SpaceCanvas player={player} />
      {phase !== "playing" && phase !== "paused" && (
        <div className={`game-entry phase-${phase}`}>
          <div className="orbit-logo">
            <i />
            <b>
              LOOK<span>SPACE</span>
            </b>
          </div>
          <p>THE UNIVERSE AWAITS</p>
          {phase === "loading" && (
            <div className="telemetry">
              <span>CALIBRATING NAVIGATION ARRAY</span>
              <div>
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>
                {Math.floor(progress)}% · PROFILE {progress > 55 ? "READY" : "LOADING"}
              </small>
            </div>
          )}
          {phase === "ready" && <button onClick={enter}>ENTER LOOKSPACE</button>}
        </div>
      )}
      {(phase === "playing" || phase === "paused") && (
        <>
          <GameHud
            player={player}
            saved={saved}
            prompt={prompt}
            onCamera={() => engine.toggleCamera()}
          />
          <MobileControls
            onMove={(x, y) => engine.setMobile(x, y)}
            onInteract={() => engine.interact()}
            onMenu={() => engine.setPhase("paused")}
          />
        </>
      )}
      {phase === "paused" && (
        <div className="pause-menu">
          <small>GAME PAUSED</small>
          <h2>LOOKSPACE</h2>
          <button onClick={enter}>RESUME</button>
          <p>Progress is saved automatically on this device.</p>
        </div>
      )}
    </main>
  );
}
