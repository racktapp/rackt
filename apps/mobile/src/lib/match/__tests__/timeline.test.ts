import { describe, expect, it, vi } from "vitest";
import { pointWonBy } from "../../tennis/engine";
import { TennisState } from "../../tennis/types";
import {
  applyTimelineUpdate,
  deriveTimelineEvent
} from "../timeline";

const createState = (overrides: Partial<TennisState> = {}): TennisState => ({
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

describe("deriveTimelineEvent", () => {
  it("creates a point event when a point is won", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const prev = createState();
    const next = pointWonBy(prev, "A");
    const event = deriveTimelineEvent(prev, next, { type: "POINT_A" });

    expect(event?.type).toBe("POINT");
    expect(event?.player).toBe("A");
    vi.useRealTimers();
  });

  it("creates a game event when a game is won", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const prev = createState({ gamePointsA: 3 });
    const next = pointWonBy(prev, "A");
    const event = deriveTimelineEvent(prev, next, { type: "POINT_A" });

    expect(event?.type).toBe("GAME");
    expect(event?.player).toBe("A");
    vi.useRealTimers();
  });

  it("creates a set event when a set is won", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const prev = createState({
      sets: [{ gamesA: 5, gamesB: 0 }],
      gamePointsA: 3
    });
    const next = pointWonBy(prev, "A");
    const event = deriveTimelineEvent(prev, next, { type: "POINT_A" });

    expect(event?.type).toBe("SET");
    expect(event?.player).toBe("A");
    vi.useRealTimers();
  });

  it("detects tie-break start at 6-6", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const prev = createState({
      sets: [{ gamesA: 5, gamesB: 6 }],
      gamePointsA: 3
    });
    const next = pointWonBy(prev, "A");
    const event = deriveTimelineEvent(prev, next, { type: "POINT_A" });

    expect(event?.type).toBe("TIEBREAK_START");
    vi.useRealTimers();
  });

  it("creates a match end event when the match is won", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const prev = createState({
      sets: [
        { gamesA: 6, gamesB: 0 },
        { gamesA: 5, gamesB: 0 }
      ],
      currentSet: 1,
      gamePointsA: 3
    });
    const next = pointWonBy(prev, "A");
    const event = deriveTimelineEvent(prev, next, { type: "POINT_A" });

    expect(event?.type).toBe("MATCH_END");
    expect(event?.player).toBe("A");
    vi.useRealTimers();
  });
});

describe("applyTimelineUpdate", () => {
  it("removes the latest event when undoing", () => {
    const timeline = [
      { id: "1", ts: 1, type: "POINT", label: "Point won" },
      { id: "2", ts: 2, type: "GAME", label: "Game won" }
    ];

    const updated = applyTimelineUpdate(
      timeline,
      { type: "UNDO" },
      null
    );

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("2");
  });
});
