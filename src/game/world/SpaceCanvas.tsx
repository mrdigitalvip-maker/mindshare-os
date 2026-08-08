import { useEffect, useRef } from "react";
import type { PlayerState } from "@/game/types";

export function SpaceCanvas({ player }: { player: PlayerState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef(player);
  playerRef.current = player;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const count = matchMedia("(pointer: coarse)").matches ? 260 : 650;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      s: Math.random() * 1.8 + 0.2,
    }));
    let frame = 0;
    const draw = (time: number) => {
      const dpr = Math.min(devicePixelRatio, 1.5),
        w = innerWidth,
        h = innerHeight;
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr;
        el.height = h * dpr;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#02040a";
      ctx.fillRect(0, 0, w, h);
      const nebula = ctx.createRadialGradient(w * 0.7, h * 0.38, 0, w * 0.7, h * 0.38, w * 0.65);
      nebula.addColorStop(0, "rgba(44,68,118,.22)");
      nebula.addColorStop(0.4, "rgba(49,20,91,.09)");
      nebula.addColorStop(1, "transparent");
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, w, h);
      const p = playerRef.current.position;
      stars.forEach((star, i) => {
        const drift = time * 0.000003 * (1 + star.z);
        const x = ((star.x + drift + p.x * 0.0008 * star.z) % 1) * w;
        const y = ((star.y + p.z * 0.00025 * star.z) % 1) * h;
        const alpha = 0.25 + 0.7 * star.z * (0.8 + Math.sin(time * 0.001 + i) * 0.2);
        ctx.fillStyle = `rgba(190,220,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, star.s * star.z, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = "rgba(91,190,255,.24)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.7, Math.min(w, h) * 0.08, Math.PI, Math.PI * 2);
      ctx.stroke();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} className="space-canvas" aria-label="Playable deep space scene" />;
}
