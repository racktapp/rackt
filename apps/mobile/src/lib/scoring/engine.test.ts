import { describe, expect, it } from "vitest";
import { createMatch, getServer, MatchState, pointWonBy } from "./engine";

const createSinglesMatch = () =>
  createMatch(
    { sport: "tennis", format: "singles" },
    { id: "A", players: [{ userId: "A-1", name: "Player A" }] },
    { id: "B", players: [{ userId: "B-1", name: "Player B" }] }
  );

const createDoublesMatch = () =>
  createMatch(
    { sport: "tennis", format: "doubles", startingServerUserId: "A-1" },
    {
      id: "A",
      players: [
        { userId: "A-1", name: "Player A1" },
        { userId: "A-2", name: "Player A2" }
      ]
    },
    {
      id: "B",
      players: [
        { userId: "B-1", name: "Player B1" },
        { userId: "B-2", name: "Player B2" }
      ]
    }
  );

const createBadmintonMatch = () =>
  createMatch(
    { sport: "badminton", format: "singles" },
    { id: "A", players: [{ userId: "A-1", name: "Player A" }] },
    { id: "B", players: [{ userId: "B-1", name: "Player B" }] }
  );

const winPoint = (state: MatchState, teamId: "A" | "B") =>
  pointWonBy(state, teamId);

const winGame = (state: MatchState, teamId: "A" | "B") => {
  let next = state;
  for (let i = 0; i < 4; i += 1) {
    next = winPoint(next, teamId);
  }
  return next;
};

const awardBadmintonPoints = (
  state: MatchState,
  teamId: "A" | "B",
  count: number
) => {
  let next = state;
  for (let i = 0; i < count; i += 1) {
    next = pointWonBy(next, teamId);
  }
  return next;
};

describe("scoring engine", () => {
  it("handles tennis singles game progression and deuce/advantage", () => {
    let state = createSinglesMatch();
    state = winPoint(state, "A");
    state = winPoint(state, "A");
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "B");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "B");
    state = winPoint(state, "A");
    state = winPoint(state, "A");

    if (state.score.sport !== "badminton") {
      expect(state.score.sets[0].gamesA).toBe(1);
      expect(state.score.gamePointsA).toBe(0);
      expect(state.score.gamePointsB).toBe(0);
    }
  });

  it("starts a tiebreak at 6-6 in tennis singles", () => {
    let state = createSinglesMatch();
    for (let i = 0; i < 6; i += 1) {
      state = winGame(state, "A");
      state = winGame(state, "B");
    }

    if (state.score.sport !== "badminton") {
      expect(state.score.isTiebreak).toBe(true);
    }
  });

  it("rotates doubles server order across games", () => {
    let state = createDoublesMatch();
    expect(getServer(state).playerUserId).toBe("A-1");
    state = winGame(state, "A");
    expect(getServer(state).playerUserId).toBe("B-1");
    state = winGame(state, "B");
    expect(getServer(state).playerUserId).toBe("A-2");
    state = winGame(state, "A");
    expect(getServer(state).playerUserId).toBe("B-2");
  });

  it("applies badminton win-by-two, cap at 30, and best-of-3", () => {
    let state = createBadmintonMatch();
    state = awardBadmintonPoints(state, "A", 20);
    state = awardBadmintonPoints(state, "B", 20);
    state = awardBadmintonPoints(state, "A", 1);
    if (state.score.sport === "badminton") {
      expect(state.score.currentGame).toBe(0);
    }
    state = awardBadmintonPoints(state, "A", 1);
    if (state.score.sport === "badminton") {
      expect(state.score.currentGame).toBe(1);
    }

    state = awardBadmintonPoints(state, "A", 21);
    state = awardBadmintonPoints(state, "A", 21);
    if (state.score.sport === "badminton") {
      expect(state.score.matchWinner).toBe("A");
    }

    let capState = createBadmintonMatch();
    capState = awardBadmintonPoints(capState, "A", 29);
    capState = awardBadmintonPoints(capState, "B", 29);
    capState = awardBadmintonPoints(capState, "A", 1);
    if (capState.score.sport === "badminton") {
      expect(capState.score.games[0].pointsA).toBe(30);
      expect(capState.score.currentGame).toBe(1);
    }
  });
});
