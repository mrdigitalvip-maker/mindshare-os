export type PilotSave = {
  callsign: string;
  credits: number;
  mission: string;
  position: { x: number; y: number };
  updatedAt: number;
};
const KEY = "lookspace.commander.v1";
export const SaveSystem = {
  load(): PilotSave | null {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "null") as PilotSave | null;
    } catch {
      return null;
    }
  },
  save(data: PilotSave) {
    localStorage.setItem(KEY, JSON.stringify({ ...data, updatedAt: Date.now() }));
  },
};
