export type Body = { x: number; y: number; vx: number; vy: number };
export class PhysicsSystem {
  step(body: Body, thrust: number, strafe: number, dt: number) {
    const force = thrust * (thrust > 0 ? 34 : 18);
    body.vy += (force - body.vy * 1.8) * dt;
    body.vx += (strafe * 25 - body.vx * 2.2) * dt;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.x = Math.max(-42, Math.min(42, body.x));
    body.y = Math.max(-22, Math.min(140, body.y));
  }
}
