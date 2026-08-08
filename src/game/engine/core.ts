import { GAME_CONFIG } from "@/game/config/game";
import type { CameraMode, GamePhase, PlayerState } from "@/game/types";

type Events = { state: PlayerState; phase: GamePhase; saved: number; prompt: string | null };
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
  position: { x: 0, y: 0, z: 18 },
  lastLocation: GAME_CONFIG.location,
  settings: {
    camera: "first-person",
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
  interact() {
    this.bus.emit("prompt", "NAV BEACON LINKED · +25 XP");
    this.state = { ...this.state, xp: this.state.xp + 25 };
    this.bus.emit("state", this.state);
    setTimeout(() => this.bus.emit("prompt", null), 1800);
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
      const dx = (Number(k.has("KeyD")) - Number(k.has("KeyA")) + this.input.mobile.x) * speed * dt;
      const dz = (Number(k.has("KeyS")) - Number(k.has("KeyW")) + this.input.mobile.y) * speed * dt;
      this.state = {
        ...this.state,
        playTime: this.state.playTime + dt,
        position: {
          ...this.state.position,
          x: this.state.position.x + dx,
          z: this.state.position.z + dz,
        },
      };
      this.bus.emit("state", this.state);
      if (now - this.lastSave > GAME_CONFIG.saveInterval) this.persist();
    }
    this.frame = requestAnimationFrame(this.tick);
  };
}
