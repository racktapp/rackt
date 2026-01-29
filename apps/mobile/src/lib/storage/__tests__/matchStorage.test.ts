import { beforeEach, describe, expect, it } from "vitest";
import { initialState } from "../../tennis/engine";
import {
  clearMatch,
  loadMatch,
  MatchConfig,
  saveMatch
} from "../matchStorage";

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

describe("matchStorage", () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
  });

  it("returns null when no match is stored", () => {
    expect(loadMatch()).toBeNull();
  });

  it("saves and loads match data", () => {
    const config: MatchConfig = {
      playerAName: "Player A",
      playerBName: "Player B",
      bestOf: 3,
      tiebreakAt6All: true,
      startingServer: "A",
      startTime: Date.now()
    };
    const tennisState = initialState({
      bestOf: config.bestOf,
      tiebreakAt6All: config.tiebreakAt6All,
      startingServer: config.startingServer
    });
    saveMatch({ config, tennisState, history: [], timeline: [] });

    const loaded = loadMatch();
    expect(loaded).not.toBeNull();
    expect(loaded?.config).toEqual(config);
    expect(loaded?.tennisState.server).toBe("A");
    expect(loaded?.timeline).toEqual([]);
  });

  it("clears saved match data", () => {
    const config: MatchConfig = {
      playerAName: "Player A",
      playerBName: "Player B",
      bestOf: 3,
      tiebreakAt6All: true,
      startingServer: "A",
      startTime: Date.now()
    };
    const tennisState = initialState();
    saveMatch({ config, tennisState, history: [], timeline: [] });

    clearMatch();
    expect(loadMatch()).toBeNull();
  });
});
