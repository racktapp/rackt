import { MatchPreset } from "./types";

const STORAGE_KEY = "rackt.presets.custom";

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const loadCustomPresets = (): MatchPreset[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as MatchPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomPresets = (presets: MatchPreset[]): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(presets));
};

export const clearCustomPresets = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEY);
};
