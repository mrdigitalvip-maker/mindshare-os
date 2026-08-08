import type { PlayerState } from "@/game/types";

export function GameHud({
  player,
  saved,
  prompt,
  onCamera,
}: {
  player: PlayerState;
  saved: number;
  prompt: string | null;
  onCamera: () => void;
}) {
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
        <strong>{player.lastLocation}</strong>
        <span>
          {p.x.toFixed(1)} &nbsp; {p.y.toFixed(1)} &nbsp; {p.z.toFixed(1)}
        </span>
      </section>
      <section className="hud-panel hud-status">
        <span className="online" /> ONLINE
        <br />
        <small>{saved ? "PROGRESS SAVED" : "SYNCING…"}</small>
      </section>
      <button className="camera-switch" onClick={onCamera}>
        {player.settings.camera === "first-person" ? "1P" : "3P"} CAMERA · V
      </button>
      <div className="crosshair">·</div>
      {prompt && <div className="interaction-prompt">{prompt}</div>}
      <div className="controls-hint">
        WASD MOVE &nbsp; · &nbsp; SHIFT BOOST &nbsp; · &nbsp; E INTERACT &nbsp; · &nbsp; ESC MENU
      </div>
    </div>
  );
}
