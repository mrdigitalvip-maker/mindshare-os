import { useEffect, useState } from "react";
import type { InteractionId, PlayerState } from "@/game/types";
const labels: Record<InteractionId, string> = {
  mission: "MISSION TERMINAL",
  observation: "OBSERVATION PANEL",
  control: "CONTROL TERMINAL",
  "hangar-door": "HANGAR DOOR",
  ship: "AURORA I",
};
export function GameHud({
  player,
  saved,
  target,
  locked,
  onCamera,
}: {
  player: PlayerState;
  saved: number;
  target: InteractionId | null;
  locked: boolean;
  onCamera: () => void;
}) {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let frames = 0,
      last = performance.now(),
      raf = 0;
    const tick = (n: number) => {
      frames++;
      if (n - last > 500) {
        setFps(Math.round((frames * 1000) / (n - last)));
        frames = 0;
        last = n;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const p = player.position;
  return (
    <div className="game-hud">
      <section className="hud-panel hud-profile">
        <small>EXPLORER // LVL {player.level}</small>
        <strong>{player.username}</strong>
        <div className="xp">
          <i style={{ width: `${Math.min(player.xp / 10, 100)}%` }} />
        </div>
        <small>{player.xp} / 1000 XP</small>
      </section>
      <section className="hud-panel hud-location">
        <small>CURRENT LOCATION</small>
        <strong>ASTRA OUTPOST</strong>
        <span>
          SPAWN DECK · {p.x.toFixed(1)} / {p.y.toFixed(1)} / {p.z.toFixed(1)}
        </span>
      </section>
      <section className="hud-panel hud-status">
        <span className="online" /> {fps} FPS
        <br />
        <small>
          {saved ? "POSITION SAVED" : "LOCAL SAVE READY"} · {player.settings.quality.toUpperCase()}
        </small>
      </section>
      <button className="camera-switch" onClick={onCamera}>
        {player.settings.camera === "first-person" ? "FIRST PERSON" : "THIRD PERSON"} · V
      </button>
      <div className="crosshair">+</div>
      {target && (
        <div className="interaction-prompt">
          <b>[E] INTERAGIR</b>
          <small>{labels[target]}</small>
        </div>
      )}{" "}
      {!locked && <div className="pointer-hint">CLICK WORLD TO ENGAGE MOUSE LOOK</div>}
      <div className="controls-hint">
        WASD MOVE · SHIFT SPRINT · E INTERACT · V CAMERA · ESC PAUSE
      </div>
    </div>
  );
}
