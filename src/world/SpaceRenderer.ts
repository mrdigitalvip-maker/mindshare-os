import type { Body } from "../physics/PhysicsSystem";
const stars = Array.from({ length: 260 }, (_, i) => ({
  x: ((i * 197) % 997) / 997,
  y: ((i * 431) % 991) / 991,
  s: i % 7 === 0 ? 1.8 : 0.7,
  a: 0.22 + (i % 8) / 12,
}));
export function renderSpace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  ship: Body,
) {
  ctx.fillStyle = "#02050a";
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.66, h * 0.38, 0, w * 0.66, h * 0.38, w * 0.56);
  glow.addColorStop(0, "#12364a");
  glow.addColorStop(0.35, "#071521");
  glow.addColorStop(1, "#02050a");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  for (const star of stars) {
    ctx.globalAlpha = star.a * (0.8 + Math.sin(time + star.x * 30) * 0.2);
    ctx.fillStyle = "#c9efff";
    ctx.fillRect(star.x * w, (star.y * h + ship.y * 3) % h, star.s, star.s);
  }
  ctx.globalAlpha = 1;
  const bx = w * 0.66 - ship.x * 5,
    by = h * 0.38 + ship.y * 1.2;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(time * 0.035);
  ctx.strokeStyle = "#2e7188";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 170, 56, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-time * 0.08);
  ctx.fillStyle = "#0a1e29";
  ctx.strokeStyle = "#69c8e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-95, 0);
  ctx.lineTo(-38, -24);
  ctx.lineTo(40, -17);
  ctx.lineTo(100, 0);
  ctx.lineTo(40, 17);
  ctx.lineTo(-38, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#79dfff";
  for (let x = -60; x < 70; x += 20) ctx.fillRect(x, -2, 10, 4);
  ctx.restore();
  const sx = w / 2 + ship.x * 3,
    sy = h * 0.72 - ship.y;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = "#122936";
  ctx.strokeStyle = "#8adfff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(13, 13);
  ctx.lineTo(0, 8);
  ctx.lineTo(-13, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (ship.vy > 2) {
    ctx.fillStyle = "#65dfff";
    ctx.fillRect(-3, 12, 6, 8 + Math.random() * 10);
  }
  ctx.restore();
}
