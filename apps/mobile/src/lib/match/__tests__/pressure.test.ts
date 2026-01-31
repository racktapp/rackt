import { describe, expect, it } from "vitest";
import { getPressure } from "../pressure";
import { MatchConfig } from "../../storage/matchStorage";
import { createMatch, MatchState } from "../../scoring/engine";

const baseConfig: MatchConfig = {
  sport: "tennis",
  format: "singles",
  teamA: { id: "A", players: [{ userId: "A-1", name: "Antti" }] },
  teamB: { id: "B", players: [{ userId: "B-1", name: "Elias" }] },
  bestOf: 3,
  tiebreakAt6All: true,
  tiebreakAt: 6,
  tiebreakTo: 7,
  superTiebreakOnly: false,
  shortSetTo: undefined,
  startTime: 1000
};

const baseState = (
  overrides: Partial<MatchState["score"]> = {},
  serverIndex = 0
): MatchState => {
  const base = createMatch(baseConfig, baseConfig.teamA, baseConfig.teamB);
  return {
    ...base,
    score: { ...base.score, ...overrides },
    server: { ...base.server, index: serverIndex }
  };
};

describe("getPressure", () => {
  it("detects break point when receiver has game point", () => {
    const state = baseState({
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
      gamePointsB: 2
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
      gamePointsB: 2
    });

    expect(getPressure(state, baseConfig)).toEqual({
      player: "A",
      type: "MATCH_POINT"
    });
  });

  it("prioritizes match point over break point when both apply", () => {
    const state = baseState(
      {
        sets: [
          { gamesA: 6, gamesB: 4 },
          { gamesA: 5, gamesB: 4 }
        ],
        currentSet: 1,
        gamePointsA: 3,
        gamePointsB: 2
      },
      1
    );

    expect(getPressure(state, baseConfig)).toEqual({
      player: "A",
      type: "MATCH_POINT"
    });
  });
});
