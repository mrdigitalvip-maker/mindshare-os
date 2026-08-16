import { useEffect, useRef, useState } from "react";
import { GameLoop } from "../engine/GameLoop";
import { InputSystem } from "../controls/InputSystem";
import { PhysicsSystem, type Body } from "../physics/PhysicsSystem";
import { renderSpace } from "../world/SpaceRenderer";
import { firstMission } from "../missions/MissionSystem";
import { SaveSystem } from "../save/SaveSystem";
import { AudioSystem } from "../audio/AudioSystem";
import { HUD } from "../ui/HUD";
import { BootSequence } from "../ui/BootSequence";

export function LookSpaceGame() {
  const canvas = useRef<HTMLCanvasElement>(null),
    body = useRef<Body>({ x: 0, y: 0, vx: 0, vy: 0 });
  const [ready, setReady] = useState(false),
    [inShip, setInShip] = useState(false),
    [speed, setSpeed] = useState(0);
  const pilot = useRef("COMMANDER"),
    audio = useRef(new AudioSystem());
  useEffect(() => {
    if (!ready) return;
    const input = new InputSystem(),
      physics = new PhysicsSystem();
    input.connect();
    const loop = new GameLoop((dt, time) => {
      const c = canvas.current;
      if (!c) return;
      const ratio = Math.min(devicePixelRatio, 2),
        w = c.clientWidth,
        h = c.clientHeight;
      if (c.width !== w * ratio || c.height !== h * ratio) {
        c.width = w * ratio;
        c.height = h * ratio;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (inShip)
        physics.step(
          body.current,
          input.state.thrust * (input.state.boost ? 2 : 1),
          input.state.strafe,
          dt,
        );
      renderSpace(ctx, w, h, time, body.current);
      setSpeed(Math.hypot(body.current.vx, body.current.vy));
    });
    loop.start();
    const save = setInterval(
      () =>
        SaveSystem.save({
          callsign: pilot.current,
          credits: 1200,
          mission: firstMission.id,
          position: { x: body.current.x, y: body.current.y },
          updatedAt: Date.now(),
        }),
      10000,
    );
    return () => {
      input.disconnect();
      loop.stop();
      clearInterval(save);
    };
  }, [ready, inShip]);
  return (
    <main className="game">
      <canvas ref={canvas} className="viewport" />
      <div className="vignette" />
      <div className="scanlines" />
      {ready ? (
        <HUD
          mission={firstMission}
          speed={speed}
          inShip={inShip}
          onInteract={() => {
            audio.current.unlock();
            audio.current.tone(inShip ? 280 : 180);
            setInShip(true);
          }}
        />
      ) : (
        <BootSequence
          onReady={(name) => {
            pilot.current = name;
            const save = SaveSystem.load();
            if (save) body.current = { ...body.current, ...save.position };
            setReady(true);
          }}
        />
      )}
    </main>
  );
}
