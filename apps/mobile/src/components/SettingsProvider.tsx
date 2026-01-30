import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useColorScheme } from "react-native";

import {
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
  Settings,
  ThemeSetting
} from "../lib/settings/settings";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  overlay: string;
};

type SettingsContextValue = {
  settings: Settings;
  resolvedTheme: "light" | "dark";
  colors: ThemeColors;
  updateSettings: (next: Partial<Settings>) => void;
  resetSettings: () => void;
};

const themeTokens: Record<"light" | "dark", ThemeColors> = {
  light: {
    background: "#f6f7fb",
    surface: "#ffffff",
    surfaceAlt: "#f1f3f7",
    text: "#101318",
    muted: "#667085",
    border: "#e1e5ee",
    accent: "#2f80ed",
    overlay: "rgba(10, 10, 20, 0.35)"
  },
  dark: {
    background: "#0b0b0f",
    surface: "#12151c",
    surfaceAlt: "#151923",
    text: "#ffffff",
    muted: "#9da5b4",
    border: "#242a36",
    accent: "#2f80ed",
    overlay: "rgba(4, 6, 10, 0.6)"
  }
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const ensureThemeStyleTag = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  const styleId = "rackt-theme-vars";
  if (document.getElementById(styleId)) {
    return;
  }
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
:root {
  --rackt-background: ${themeTokens.light.background};
  --rackt-surface: ${themeTokens.light.surface};
  --rackt-text: ${themeTokens.light.text};
  --rackt-muted: ${themeTokens.light.muted};
  --rackt-border: ${themeTokens.light.border};
}
:root[data-theme="light"] {
  --rackt-background: ${themeTokens.light.background};
  --rackt-surface: ${themeTokens.light.surface};
  --rackt-text: ${themeTokens.light.text};
  --rackt-muted: ${themeTokens.light.muted};
  --rackt-border: ${themeTokens.light.border};
}
:root[data-theme="dark"] {
  --rackt-background: ${themeTokens.dark.background};
  --rackt-surface: ${themeTokens.dark.surface};
  --rackt-text: ${themeTokens.dark.text};
  --rackt-muted: ${themeTokens.dark.muted};
  --rackt-border: ${themeTokens.dark.border};
}
@media (prefers-color-scheme: dark) {
  :root {
    --rackt-background: ${themeTokens.dark.background};
    --rackt-surface: ${themeTokens.dark.surface};
    --rackt-text: ${themeTokens.dark.text};
    --rackt-muted: ${themeTokens.dark.muted};
    --rackt-border: ${themeTokens.dark.border};
  }
}
`;
  document.head.appendChild(style);
};

const applyThemeAttribute = (theme: ThemeSetting): void => {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    ensureThemeStyleTag();
  }, []);

  useEffect(() => {
    applyThemeAttribute(settings.theme);
  }, [settings.theme]);

  const resolvedTheme = useMemo<"light" | "dark">(() => {
    if (settings.theme === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return settings.theme;
  }, [settings.theme, systemScheme]);

  const colors = useMemo(() => themeTokens[resolvedTheme], [resolvedTheme]);

  const updateSettings = useCallback((next: Partial<Settings>) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...next }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const value = useMemo(
    () => ({ settings, resolvedTheme, colors, updateSettings, resetSettings }),
    [colors, resolvedTheme, resetSettings, settings, updateSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
