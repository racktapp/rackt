import { beforeEach, describe, expect, it } from "vitest";

import {
  addToHistory,
  clearHistory,
  getHistoryById,
  loadHistory,
  MatchRecord
} from "../historyStorage";

const createMemoryStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
};

const createRecord = (id: string): MatchRecord => ({
  id,
  createdAt: Date.now(),
  players: {
    playerAName: "Player A",
    playerBName: "Player B"
  },
  bestOf: 3,
  tiebreakRule: "TIEBREAK_AT_6_ALL",
  finalScoreString: "6–4, 7–5",
  winner: "Player A",
  durationSeconds: 3600,
  sets: [
    { setNumber: 1, gamesA: 6, gamesB: 4 },
    { setNumber: 2, gamesA: 7, gamesB: 5 }
  ]
});

describe("historyStorage", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;
    (globalThis as typeof globalThis & { window?: Window }).window =
      {
        localStorage: storage
      } as Window;
  });

  it("returns empty array when history is empty", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("adds and loads history records", () => {
    const record = createRecord("match-1");
    addToHistory(record);
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(record);
  });

  it("returns a record by id", () => {
    const record = createRecord("match-2");
    addToHistory(record);
    expect(getHistoryById("match-2")).toEqual(record);
  });

  it("trims history to 10 entries", () => {
    for (let index = 0; index < 12; index += 1) {
      addToHistory(createRecord(`match-${index}`));
    }
    const history = loadHistory();
    expect(history).toHaveLength(10);
    expect(history[0].id).toBe("match-11");
  });

  it("clears stored history", () => {
    addToHistory(createRecord("match-3"));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});
