import { describe, expect, it } from "vitest";

import { applyAction } from "../actions";
import { createMatch } from "../../scoring/engine";
import { MatchConfig } from "../../scoring/engine";
import { Team } from "../../scoring/engine";

const withPoint = (player: "A" | "B") => {
  const config: MatchConfig = { sport: "tennis", format: "singles" };
  const teamA: Team = {
    id: "A",
    players: [{ userId: "A-1", name: "Player A" }]
  };
  const teamB: Team = {
    id: "B",
    players: [{ userId: "B-1", name: "Player B" }]
  };
  const state = createMatch(config, teamA, teamB);
  const action = { type: player === "A" ? "POINT_A" : "POINT_B" } as const;
  return applyAction(state, action);
};

describe("applyAction", () => {
  it("awards a point for player A", () => {
    const next = withPoint("A");
    if (next.score.sport !== "badminton") {
      expect(next.score.gamePointsA).toBe(1);
      expect(next.score.gamePointsB).toBe(0);
    }
  });

  it("awards a point for player B", () => {
    const next = withPoint("B");
    if (next.score.sport !== "badminton") {
      expect(next.score.gamePointsA).toBe(0);
      expect(next.score.gamePointsB).toBe(1);
    }
  });
});
