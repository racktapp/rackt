import { Settings } from "../settings/settings";

export type HapticAction = "point" | "undo" | "reset";

const durations: Record<HapticAction, number> = {
  point: 20,
  undo: 10,
  reset: 30
};

export const triggerHaptics = (
  settings: Settings,
  action: HapticAction
): void => {
  if (!settings.haptics) {
    return;
  }
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    navigator.vibrate(durations[action]);
  } catch (error) {
    return;
  }
};
