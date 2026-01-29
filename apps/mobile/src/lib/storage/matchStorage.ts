import { Player, TennisState } from "../tennis/types";

export type MatchConfig = {
  playerAName: string;
  playerBName: string;
  bestOf: 3 | 5;
  tiebreakAt6All: boolean;
  startingServer: Player;
};

export type StoredMatch = {
  config: MatchConfig;
  tennisState: TennisState;
  history: TennisState[];
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
    return JSON.parse(raw) as StoredMatch;
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
