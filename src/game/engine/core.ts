import { GAME_CONFIG } from "@/game/config/game";
import type { CameraMode, GamePhase, InteractionId, PlayerState, Vec3 } from "@/game/types";

type Events = {
  state: PlayerState;
  phase: GamePhase;
  saved: number;
  prompt: InteractionId | null;
  interaction: InteractionId | null;
};
type Listener<K extends keyof Events> = (value: Events[K]) => void;

export class EventBus {
  private listeners = new Map<keyof Events, Set<(value: never) => void>>();
  on<K extends keyof Events>(event: K, listener: Listener<K>) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as (value: never) => void);
    this.listeners.set(event, set);
    return () => set.delete(listener as (value: never) => void);
  }
  emit<K extends keyof Events>(event: K, value: Events[K]) {
    this.listeners.get(event)?.forEach((fn) => fn(value as never));
  }
}

const defaultPlayer = (): PlayerState => ({
  id: crypto.randomUUID(),
  username: "Explorer",
  avatar: null,
  level: 1,
  xp: 120,
  credits: 500,
  selectedShip: "Pioneer",
  playTime: 0,
  position: { x: 0, y: 1.7, z: 18 },
  lastInteraction: null,
  lastLocation: GAME_CONFIG.location,
  settings: {
    camera: "first-person",
    quality:
      typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4
        ? "low"
        : "high",
    yaw: Math.PI,
    pitch: 0,
    masterVolume: 0.8,
    musicVolume: 0.5,
    effectsVolume: 0.7,
    muted: false,
  },
});

export class SaveManager {
  load(): PlayerState {
    if (typeof window === "undefined") return defaultPlayer();
    try {
      return {
        ...defaultPlayer(),
        ...JSON.parse(localStorage.getItem(GAME_CONFIG.saveKey) ?? "null"),
      };
    } catch {
      return defaultPlayer();
    }
  }
  save(state: PlayerState) {
    localStorage.setItem(GAME_CONFIG.saveKey, JSON.stringify(state));
  }
}

export class InputManager {
  keys = new Set<string>();
  mobile = { x: 0, y: 0 };
  private down = (event: KeyboardEvent) => this.keys.add(event.code);
  private up = (event: KeyboardEvent) => this.keys.delete(event.code);
  connect() {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
  }
  disconnect() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
  }
}

export class AudioManager {
  ambient: HTMLAudioElement | null = null;
  apply(settings: PlayerState["settings"]) {
    if (this.ambient) {
      this.ambient.volume = settings.masterVolume * settings.musicVolume;
      this.ambient.muted = settings.muted;
    }
  }
  dispose() {
    this.ambient?.pause();
    this.ambient = null;
  }
}

export class GameEngine {
  bus = new EventBus();
  input = new InputManager();
  saves = new SaveManager();
  audio = new AudioManager();
  state = this.saves.load();
  phase: GamePhase = "splash";
  private frame = 0;
  private last = 0;
  private lastSave = 0;
  private velocity = { x: 0, z: 0 };
  activeInteraction: InteractionId | null = null;
  start() {
    this.input.connect();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }
  stop() {
    cancelAnimationFrame(this.frame);
    this.input.disconnect();
    this.audio.dispose();
    this.persist();
  }
  setPhase(phase: GamePhase) {
    this.phase = phase;
    this.bus.emit("phase", phase);
  }
  toggleCamera() {
    const camera: CameraMode =
      this.state.settings.camera === "first-person" ? "third-person" : "first-person";
    this.state = { ...this.state, settings: { ...this.state.settings, camera } };
    this.bus.emit("state", this.state);
  }
  setMobile(x: number, y: number) {
    this.input.mobile = { x, y };
  }
  look(dx: number, dy: number) {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        yaw: this.state.settings.yaw - dx * 0.0022,
        pitch: Math.max(-1.35, Math.min(1.35, this.state.settings.pitch - dy * 0.0022)),
      },
    };
    this.bus.emit("state", this.state);
  }
  setTarget(id: InteractionId | null) {
    if (id === this.activeInteraction) return;
    this.activeInteraction = id;
    this.bus.emit("interaction", id);
  }
  interact() {
    if (!this.activeInteraction) return;
    this.state = { ...this.state, lastInteraction: this.activeInteraction };
    this.bus.emit("state", this.state);
    this.bus.emit("prompt", this.activeInteraction);
  }
  private persist() {
    this.saves.save(this.state);
    this.lastSave = Date.now();
    this.bus.emit("saved", this.lastSave);
  }
  private tick = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    if (this.phase === "playing") {
      const k = this.input.keys,
        speed = GAME_CONFIG.moveSpeed * (k.has("ShiftLeft") ? GAME_CONFIG.sprintMultiplier : 1);
      const side = Number(k.has("KeyD")) - Number(k.has("KeyA")) + this.input.mobile.x;
      const forward = Number(k.has("KeyW")) - Number(k.has("KeyS")) - this.input.mobile.y;
      const yaw = this.state.settings.yaw;
      const wantedX = (Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed;
      const wantedZ = (Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed;
      const blend =
        1 - Math.exp(-(side || forward ? GAME_CONFIG.acceleration : GAME_CONFIG.damping) * dt);
      this.velocity.x += (wantedX - this.velocity.x) * blend;
      this.velocity.z += (wantedZ - this.velocity.z) * blend;
      const next = collide({
        ...this.state.position,
        x: this.state.position.x + this.velocity.x * dt,
        z: this.state.position.z + this.velocity.z * dt,
      });
      this.state = {
        ...this.state,
        playTime: this.state.playTime + dt,
        position: next,
      };
      this.bus.emit("state", this.state);
      if (now - this.lastSave > GAME_CONFIG.saveInterval) this.persist();
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}

/** Lightweight capsule/box collision contract, ready to be replaced by rigid bodies. */
export interface CollisionBody {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
const blockers: CollisionBody[] = [
  { minX: -8, maxX: -2, minZ: -17, maxZ: -14 },
  { minX: 2, maxX: 8, minZ: -17, maxZ: -14 },
  { minX: -2.1, maxX: 2.1, minZ: -34, maxZ: -27 },
  { minX: 6.2, maxX: 8, minZ: 3, maxZ: 7 },
];
function collide(p: Vec3): Vec3 {
  const radius = 0.45;
  const old = p;
  p = { ...p, x: Math.max(-9.4, Math.min(9.4, p.x)), z: Math.max(-43, Math.min(21, p.z)), y: 1.7 };
  for (const b of blockers)
    if (
      p.x > b.minX - radius &&
      p.x < b.maxX + radius &&
      p.z > b.minZ - radius &&
      p.z < b.maxZ + radius
    )
      return { ...old, y: 1.7 };
  return p;
}
