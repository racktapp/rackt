import { describe, expect, it } from "vitest";
import { initialState } from "../../tennis/engine";
import { applyAction } from "../actions";

describe("applyAction", () => {
  it("applies POINT_A", () => {
    const state = initialState();
    const next = applyAction(state, { type: "POINT_A" });
    expect(next.gamePointsA).toBe(1);
    expect(next.gamePointsB).toBe(0);
  });

  it("applies POINT_B", () => {
    const state = initialState();
    const next = applyAction(state, { type: "POINT_B" });
    expect(next.gamePointsA).toBe(0);
    expect(next.gamePointsB).toBe(1);
  });
});
