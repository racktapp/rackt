import { beforeEach, describe, expect, it } from "vitest";
import { createMatch } from "../../scoring/engine";
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
      sport: "tennis",
      format: "singles",
      teamA: { id: "A", players: [{ userId: "A-1", name: "Player A" }] },
      teamB: { id: "B", players: [{ userId: "B-1", name: "Player B" }] },
      bestOf: 3,
      tiebreakAt6All: true,
      tiebreakAt: 6,
      tiebreakTo: 7,
      superTiebreakOnly: false,
      shortSetTo: undefined,
      startTime: Date.now()
    };
    const matchState = createMatch(config, config.teamA, config.teamB);
    saveMatch({ config, matchState, history: [], timeline: [] });

    const loaded = loadMatch();
    expect(loaded).not.toBeNull();
    expect(loaded?.config).toEqual(config);
    expect(loaded?.matchState.server.type).toBe("tennis");
    expect(loaded?.timeline).toEqual([]);
  });

  it("clears saved match data", () => {
    const config: MatchConfig = {
      sport: "tennis",
      format: "singles",
      teamA: { id: "A", players: [{ userId: "A-1", name: "Player A" }] },
      teamB: { id: "B", players: [{ userId: "B-1", name: "Player B" }] },
      bestOf: 3,
      tiebreakAt6All: true,
      tiebreakAt: 6,
      tiebreakTo: 7,
      superTiebreakOnly: false,
      shortSetTo: undefined,
      startTime: Date.now()
    };
    const matchState = createMatch(config, config.teamA, config.teamB);
    saveMatch({ config, matchState, history: [], timeline: [] });

    clearMatch();
    expect(loadMatch()).toBeNull();
  });
});
