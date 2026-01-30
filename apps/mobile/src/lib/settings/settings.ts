export type ThemeSetting = "system" | "light" | "dark";

export type Settings = {
  theme: ThemeSetting;
  haptics: boolean;
  sounds: boolean;
};

export const defaultSettings: Settings = {
  theme: "system",
  haptics: true,
  sounds: false
};

const SETTINGS_KEY = "rackt_settings";

const isThemeSetting = (value: unknown): value is ThemeSetting =>
  value === "system" || value === "light" || value === "dark";

export const normalizeSettings = (value: Partial<Settings> | null): Settings => {
  if (!value) {
    return defaultSettings;
  }
  return {
    theme: isThemeSetting(value.theme) ? value.theme : defaultSettings.theme,
    haptics:
      typeof value.haptics === "boolean"
        ? value.haptics
        : defaultSettings.haptics,
    sounds:
      typeof value.sounds === "boolean"
        ? value.sounds
        : defaultSettings.sounds
  };
};

const getStorage = (): Storage | null => {
  if (typeof globalThis === "undefined") {
    return null;
  }
  try {
    if ("localStorage" in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (error) {
    return null;
  }
  return null;
};

export const loadSettings = (): Settings => {
  try {
    const storage = getStorage();
    if (!storage) {
      return defaultSettings;
    }
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return normalizeSettings(parsed);
  } catch (error) {
    return defaultSettings;
  }
};

export const saveSettings = (settings: Settings): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
};
