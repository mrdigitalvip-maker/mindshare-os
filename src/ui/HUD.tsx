import type { Mission } from "../missions/MissionSystem";
export function HUD({
  mission,
  speed,
  onInteract,
  inShip,
}: {
  mission: Mission;
  speed: number;
  onInteract: () => void;
  inShip: boolean;
}) {
  return (
    <div className="hud">
      <div className="topbar">
        <div className="brand">
          <div className="mark" />
          <div>
            <div className="eyebrow">LOOKSPACE COMMAND</div>
            <div className="title">STARBASE // AURORA GATE</div>
          </div>
        </div>
        <div className="status">
          <span className="online">● SISTEMAS ONLINE</span>
          <br />
          SETOR 07 · ÓRBITA ESTÁVEL
          <br />
          HORÁRIO 21:47:03
        </div>
      </div>
      <div className="mission">
        <h3>MISSÃO ATIVA // 01</h3>
        <strong>{mission.title}</strong>
        <p>{mission.description}</p>
      </div>
      <div className="meters">
        <Meter label="CASCO" value={100} />
        <Meter label="ENERGIA" value={87} />
        <Meter label="PROPULSÃO" value={Math.min(100, 30 + speed * 3)} />
      </div>
      <div className="reticle" />
      <button className="interact" onClick={onInteract}>
        [ E ] {inShip ? "INICIAR LANÇAMENTO" : "ENTRAR NA NAVE"}
      </button>
      <div className="joystick">
        <i />
      </div>
      <div className="footer">
        <div className="coords">
          X 018.42 · Y 004.91 · Z 771.06
          <br />
          VELOCIDADE {speed.toFixed(1)} M/S
        </div>
        <div className="hint">WASD PARA NAVEGAR · SHIFT PARA IMPULSO</div>
      </div>
    </div>
  );
}
function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <label>
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </label>
      <div className="track">
        <div className="fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
