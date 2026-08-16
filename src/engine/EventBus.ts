export type GameEvents = {
  "mission:accepted": string;
  "ship:entered": undefined;
  "save:complete": number;
};
export class EventBus {
  private listeners = new Map<keyof GameEvents, Set<(value: never) => void>>();
  on<K extends keyof GameEvents>(event: K, fn: (value: GameEvents[K]) => void) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn as (value: never) => void);
    this.listeners.set(event, set);
    return () => set.delete(fn as (value: never) => void);
  }
  emit<K extends keyof GameEvents>(event: K, value: GameEvents[K]) {
    this.listeners.get(event)?.forEach((fn) => fn(value as never));
  }
}
export const gameEvents = new EventBus();
