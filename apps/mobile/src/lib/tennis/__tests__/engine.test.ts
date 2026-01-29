import { describe, expect, it } from "vitest";
import { initialState, pointWonBy } from "../engine";
import { Player, TennisState } from "../types";

const winPoint = (state: TennisState, player: Player): TennisState =>
  pointWonBy(state, player);

const winGame = (state: TennisState, player: Player): TennisState => {
  let next = state;
  for (let i = 0; i < 4; i += 1) {
    next = winPoint(next, player);
  }
  return next;
};

const winGames = (
  state: TennisState,
  player: Player,
  count: number
): TennisState => {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = winGame(next, player);
  }
  return next;
};

describe("tennis engine", () => {
  it("A wins a clean game (4 straight points)", () => {
    let state = initialState();
    state = winGame(state, "A");

    expect(state.sets[0].gamesA).toBe(1);
    expect(state.sets[0].gamesB).toBe(0);
    expect(state.gamePointsA).toBe(0);
    expect(state.gamePointsB).toBe(0);
  });

  it("handles deuce -> advantage -> deuce -> win", () => {
    let state = initialState();
    state = winPoint(state, "A"); // 15-0
    state = winPoint(state, "A"); // 30-0
    state = winPoint(state, "A"); // 40-0
    state = winPoint(state, "B"); // 40-15
    state = winPoint(state, "B"); // 40-30
    state = winPoint(state, "B"); // deuce
    state = winPoint(state, "A"); // advantage A
    state = winPoint(state, "B"); // back to deuce
    state = winPoint(state, "A"); // advantage A
    state = winPoint(state, "A"); // game A

    expect(state.sets[0].gamesA).toBe(1);
    expect(state.sets[0].gamesB).toBe(0);
  });

  it("awards a set win 6-4", () => {
    let state = initialState();
    state = winGames(state, "A", 3);
    state = winGames(state, "B", 3);
    state = winGames(state, "A", 2);
    state = winGames(state, "B", 1);
    state = winGames(state, "A", 1);

    expect(state.sets[0].gamesA).toBe(6);
    expect(state.sets[0].gamesB).toBe(4);
    expect(state.currentSet).toBe(1);
  });

  it("plays a tie-break at 6-6 and wins 7-5 in TB", () => {
    let state = initialState();
    for (let i = 0; i < 6; i += 1) {
      state = winGame(state, "A");
      state = winGame(state, "B");
    }

    expect(state.isTiebreak).toBe(true);
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "A");
    state = winPoint(state, "A");

    expect(state.sets[0].gamesA).toBe(7);
    expect(state.sets[0].gamesB).toBe(6);
    expect(state.currentSet).toBe(1);
  });

  it("switches server each game", () => {
    let state = initialState();
    expect(state.server).toBe("A");
    state = winGame(state, "A");
    expect(state.server).toBe("B");
    state = winGame(state, "B");
    expect(state.server).toBe("A");
  });

  it("follows tie-break serving order", () => {
    let state = initialState();
    for (let i = 0; i < 6; i += 1) {
      state = winGame(state, "A");
      state = winGame(state, "B");
    }

    expect(state.isTiebreak).toBe(true);
    expect(state.server).toBe("A");

    state = winPoint(state, "A"); // point 1
    expect(state.server).toBe("B");
    state = winPoint(state, "B"); // point 2
    expect(state.server).toBe("B");
    state = winPoint(state, "A"); // point 3
    expect(state.server).toBe("A");
    state = winPoint(state, "A"); // point 4
    expect(state.server).toBe("A");
    state = winPoint(state, "B"); // point 5
    expect(state.server).toBe("B");
  });
});
