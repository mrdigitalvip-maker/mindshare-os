import type { Vec3 } from "@/game/types";
export interface RigidBodyAdapter {
  position: Vec3;
  velocity: Vec3;
  move(next: Vec3): Vec3;
}
export interface WorldTrigger {
  id: string;
  center: Vec3;
  radius: number;
  kind: "interaction" | "docking" | "ship";
}
