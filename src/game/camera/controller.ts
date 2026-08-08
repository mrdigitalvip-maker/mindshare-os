import type { CameraMode, Vec3 } from "@/game/types";
export function cameraPosition(player: Vec3, yaw: number, mode: CameraMode): Vec3 {
  if (mode === "first-person") return player;
  return { x: player.x - Math.sin(yaw) * 5, y: player.y + 2.5, z: player.z - Math.cos(yaw) * 5 };
}
