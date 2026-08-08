export type Vec3 = { x: number; y: number; z: number };
export type CameraMode = "first-person" | "third-person";
export type GamePhase = "splash" | "loading" | "ready" | "playing" | "paused";

export interface PlayerState {
  id: string;
  username: string;
  avatar: string | null;
  level: number;
  xp: number;
  credits: number;
  selectedShip: string;
  playTime: number;
  position: Vec3;
  lastLocation: string;
  settings: {
    camera: CameraMode;
    masterVolume: number;
    musicVolume: number;
    effectsVolume: number;
    muted: boolean;
  };
}
