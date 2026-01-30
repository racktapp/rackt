import { SetSummary } from "../match/summary";

export type MatchRecord = {
  id: string;
  createdAt: number;
  players: {
    playerAName: string;
    playerBName: string;
  };
  bestOf: 3 | 5;
  tiebreakRule: "TIEBREAK_AT_6_ALL" | "ADVANTAGE";
  finalScoreString: string;
  winner: string;
  durationSeconds: number;
  sets: SetSummary[];
};

const STORAGE_KEY = "rackt.history";

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

export const loadHistory = (): MatchRecord[] => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as MatchRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

export const addToHistory = (record: MatchRecord): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const existing = loadHistory();
  const next = [
    record,
    ...existing.filter((item) => item.id !== record.id)
  ].slice(0, 10);
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const getHistoryById = (id: string): MatchRecord | null => {
  const history = loadHistory();
  return history.find((record) => record.id === id) ?? null;
};

export const clearHistory = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEY);
};
