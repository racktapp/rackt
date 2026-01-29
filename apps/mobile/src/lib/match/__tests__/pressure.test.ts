import { describe, expect, it } from "vitest";
import { getPressure } from "../pressure";
import { MatchConfig } from "../../storage/matchStorage";
import { TennisState } from "../../tennis/types";

const baseConfig: MatchConfig = {
  playerAName: "Antti",
  playerBName: "Elias",
  bestOf: 3,
  tiebreakAt6All: true,
  startingServer: "A",
  startTime: 1000
};

const baseState = (overrides: Partial<TennisState> = {}): TennisState => ({
  bestOf: 3,
  tiebreakAt6All: true,
  sets: [{ gamesA: 0, gamesB: 0 }],
  currentSet: 0,
  gamePointsA: 0,
  gamePointsB: 0,
  isTiebreak: false,
  tiebreakPointsA: 0,
  tiebreakPointsB: 0,
  server: "A",
  ...overrides
});

describe("getPressure", () => {
  it("detects break point when receiver has game point", () => {
    const state = baseState({
      server: "A",
      gamePointsA: 2,
      gamePointsB: 3
    });

    expect(getPressure(state, baseConfig)).toEqual({
      player: "B",
      type: "BREAK_POINT"
    });
  });

  it("detects set point when player can win the set on next point", () => {
    const state = baseState({
      sets: [{ gamesA: 5, gamesB: 3 }],
      gamePointsA: 3,
      gamePointsB: 2,
      server: "A"
    });

    expect(getPressure(state, baseConfig)).toEqual({
      player: "A",
      type: "SET_POINT"
    });
  });

  it("detects match point when player can win the match on next point", () => {
    const state = baseState({
      sets: [
        { gamesA: 6, gamesB: 4 },
        { gamesA: 5, gamesB: 4 }
      ],
      currentSet: 1,
      gamePointsA: 3,
      gamePointsB: 2,
      server: "A"
    });

    expect(getPressure(state, baseConfig)).toEqual({
      player: "A",
      type: "MATCH_POINT"
    });
  });

  it("prioritizes match point over break point when both apply", () => {
    const state = baseState({
      sets: [
        { gamesA: 6, gamesB: 4 },
        { gamesA: 5, gamesB: 4 }
      ],
      currentSet: 1,
      gamePointsA: 3,
      gamePointsB: 2,
      server: "B"
    });

    expect(getPressure(state, baseConfig)).toEqual({
      player: "A",
      type: "MATCH_POINT"
    });
  });
});
