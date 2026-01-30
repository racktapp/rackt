import { Settings } from "../settings/settings";

export type SoundAction = "point" | "undo";

let audioContext: any = null;

const getAudioContext = (): any | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const AudioConstructor =
    (window as typeof window & { AudioContext?: any; webkitAudioContext?: any })
      .AudioContext ||
    (window as typeof window & { webkitAudioContext?: any }).webkitAudioContext;
  if (!AudioConstructor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioConstructor();
  }
  return audioContext;
};

const toneForAction: Record<SoundAction, number> = {
  point: 720,
  undo: 420
};

export const playSound = (settings: Settings, action: SoundAction): void => {
  if (!settings.sounds) {
    return;
  }
  const context = getAudioContext();
  if (!context) {
    return;
  }
  try {
    if (context.state === "suspended") {
      void context.resume();
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = toneForAction[action];
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch (error) {
    return;
  }
};
