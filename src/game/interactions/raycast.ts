import { INTERACTIVES } from "@/game/world/starbase/layout";
import type { InteractionId, Vec3 } from "@/game/types";
export function raycastInteraction(origin: Vec3, yaw: number, pitch: number): InteractionId | null {
  let winner: InteractionId | null = null,
    nearest = 5;
  const forward = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  };
  for (const [id, target] of Object.entries(INTERACTIVES) as [InteractionId, Vec3][]) {
    const dx = target.x - origin.x,
      dy = target.y - origin.y,
      dz = target.z - origin.z,
      distance = Math.hypot(dx, dy, dz);
    const alignment = (dx * forward.x + dy * forward.y + dz * forward.z) / distance;
    if (distance < nearest && alignment > 0.72) {
      winner = id;
      nearest = distance;
    }
  }
  return winner;
}
