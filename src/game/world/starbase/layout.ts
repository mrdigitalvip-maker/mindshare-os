import type { InteractionId, Vec3 } from "@/game/types";

export type WorldObject = {
  position: Vec3;
  scale: Vec3;
  color: [number, number, number];
  emissive?: boolean;
};
export const INTERACTIVES: Record<InteractionId, Vec3> = {
  mission: { x: -7, y: 1.5, z: 5 },
  observation: { x: 8.4, y: 1.8, z: -5 },
  "hangar-door": { x: 0, y: 2, z: -15 },
  ship: { x: 0, y: 1, z: -31 },
  control: { x: 7, y: 1.5, z: -22 },
};
const box = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: [number, number, number],
  emissive = false,
): WorldObject => ({ position: { x, y, z }, scale: { x: sx, y: sy, z: sz }, color, emissive });
export const ASTRA_GEOMETRY: WorldObject[] = [
  box(0, -0.2, -11, 20, 0.4, 66, [0.035, 0.065, 0.085]),
  box(-10, 2, -11, 0.5, 4.5, 66, [0.06, 0.09, 0.12]),
  box(10, 2, -11, 0.5, 4.5, 66, [0.06, 0.09, 0.12]),
  box(0, 4.2, -11, 20, 0.3, 66, [0.045, 0.07, 0.09]),
  ...Array.from({ length: 9 }, (_, i) =>
    box(-9.5, 1.7, 18 - i * 7, 0.25, 3.4, 1.4, [0.08, 0.22, 0.28], true),
  ),
  ...Array.from({ length: 9 }, (_, i) =>
    box(9.5, 1.7, 18 - i * 7, 0.25, 3.4, 1.4, [0.08, 0.22, 0.28], true),
  ),
  box(-7, 1.1, 5, 1.5, 2.2, 0.8, [0.03, 0.35, 0.45], true),
  box(7, 1.1, -22, 1.5, 2.2, 0.8, [0.03, 0.35, 0.45], true),
  box(-5, 2, -15, 8, 4, 0.6, [0.12, 0.16, 0.19]),
  box(5, 2, -15, 8, 4, 0.6, [0.12, 0.16, 0.19]),
  box(-7.8, 2, -5, 0.25, 3, 9, [0.04, 0.16, 0.23], true),
  box(0, 0.45, -31, 9, 0.8, 14, [0.09, 0.13, 0.16]),
];
