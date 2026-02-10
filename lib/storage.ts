import type { Color } from "./bleClient";

export type SavedMode = {
  id: string;
  name: string;
  type: string;
  speed: number;
  colors: Color[];
  createdAt: number;
};

export type SavedZone = {
  name: string;
  key: string;
  start: number;
  end: number;
};

const MODES_KEY = "ble_saved_modes";
const ZONES_KEY = "ble_saved_zones";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Modes Library ---

export function getSavedModes(): SavedMode[] {
  return read<SavedMode[]>(MODES_KEY, []);
}

export function saveMode(mode: Omit<SavedMode, "id" | "createdAt">): SavedMode {
  const modes = getSavedModes();
  const entry: SavedMode = {
    ...mode,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: Date.now(),
  };
  modes.push(entry);
  write(MODES_KEY, modes);
  return entry;
}

export function deleteMode(id: string) {
  const modes = getSavedModes().filter((m) => m.id !== id);
  write(MODES_KEY, modes);
}

// --- Saved Zones ---

export function getSavedZones(): SavedZone[] {
  return read<SavedZone[]>(ZONES_KEY, []);
}

export function saveZone(zone: SavedZone) {
  const zones = getSavedZones();
  const existing = zones.findIndex((z) => z.key === zone.key);
  if (existing >= 0) {
    zones[existing] = zone;
  } else {
    zones.push(zone);
  }
  write(ZONES_KEY, zones);
}

export function deleteSavedZone(key: string) {
  const zones = getSavedZones().filter((z) => z.key !== key);
  write(ZONES_KEY, zones);
}
