import { TimelineEvent } from "../match/timeline";
import { Player, TennisState } from "../tennis/types";

export type MatchConfig = {
  playerAName: string;
  playerBName: string;
  bestOf: 1 | 3 | 5;
  tiebreakAt6All: boolean;
  tiebreakTo: 7 | 10;
  superTiebreakOnly?: boolean;
  shortSetTo?: number;
  startingServer: Player;
  startTime: number;
};

export type StoredMatch = {
  config: MatchConfig;
  tennisState: TennisState;
  history: TennisState[];
  timeline: TimelineEvent[];
};

const STORAGE_KEY = "rackt.match";

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

export const loadMatch = (): StoredMatch | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredMatch;
    return {
      ...parsed,
      config: {
        ...parsed.config,
        startTime: parsed.config?.startTime ?? Date.now(),
        tiebreakTo: parsed.config?.tiebreakTo ?? 7,
        superTiebreakOnly: parsed.config?.superTiebreakOnly ?? false,
        shortSetTo: parsed.config?.shortSetTo
      },
      timeline: parsed.timeline ?? []
    };
  } catch {
    return null;
  }
};

export const saveMatch = (match: StoredMatch): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(match));
};

export const clearMatch = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEY);
};
