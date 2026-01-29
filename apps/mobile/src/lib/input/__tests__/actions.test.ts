import { describe, expect, it } from "vitest";

import { applyAction } from "../actions";
import { initialState } from "../../tennis/engine";

const withPoint = (player: "A" | "B") => {
  const state = initialState();
  const action = { type: player === "A" ? "POINT_A" : "POINT_B" } as const;
  return applyAction(state, action);
};

describe("applyAction", () => {
  it("awards a point for player A", () => {
    const next = withPoint("A");
    expect(next.gamePointsA).toBe(1);
    expect(next.gamePointsB).toBe(0);
  });

  it("awards a point for player B", () => {
    const next = withPoint("B");
    expect(next.gamePointsA).toBe(0);
    expect(next.gamePointsB).toBe(1);
  });
});
