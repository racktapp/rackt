import { describe, expect, it } from "vitest";
import { buildMatchSummary } from "../summary";
import { MatchConfig } from "../../storage/matchStorage";
import { TimelineEvent } from "../timeline";
import { createMatch, MatchState, TennisPadelScore } from "../../scoring/engine";

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
  overrides: Partial<TennisPadelScore> = {}
): MatchState => {
  const base = createMatch(baseConfig, baseConfig.teamA, baseConfig.teamB);
  return {
    ...base,
    score: { ...(base.score as TennisPadelScore), ...overrides }
  };
};

const matchEndTimeline = (ts: number): TimelineEvent[] => [
  {
    id: `MATCH_END-A-${ts}`,
    ts,
    type: "MATCH_END",
    player: "A",
    label: "Match won"
  }
];

describe("buildMatchSummary", () => {
  it("formats final score and winner for standard sets", () => {
    const finalState = baseState({
      sets: [
        { gamesA: 6, gamesB: 4 },
        { gamesA: 3, gamesB: 6 },
        { gamesA: 6, gamesB: 3 }
      ],
      currentSet: 2,
      matchWinner: "A"
    });

    const summary = buildMatchSummary({
      config: baseConfig,
      finalState,
      timeline: matchEndTimeline(31000)
    });

    expect(summary.finalScoreString).toBe("6–4, 3–6, 6–3");
    expect(summary.winnerId).toBe("A");
    expect(summary.winnerName).toBe("Antti");
    expect(summary.durationSeconds).toBe(30);
  });

  it("supports tie-break set scoring", () => {
    const finalState = baseState({
      sets: [
        { gamesA: 7, gamesB: 6 },
        { gamesA: 6, gamesB: 4 }
      ],
      currentSet: 1,
      matchWinner: "A"
    });

    const summary = buildMatchSummary({
      config: baseConfig,
      finalState,
      timeline: matchEndTimeline(8000)
    });

    expect(summary.finalScoreString).toBe("7–6, 6–4");
    expect(summary.counts.tiebreaksPlayed).toBe(1);
  });

  it("derives winner when matchWinner is missing", () => {
    const finalState = baseState({
      sets: [
        { gamesA: 4, gamesB: 6 },
        { gamesA: 3, gamesB: 6 }
      ],
      currentSet: 1
    });

    const summary = buildMatchSummary({
      config: baseConfig,
      finalState,
      timeline: matchEndTimeline(9000)
    });

    expect(summary.winnerId).toBe("B");
    expect(summary.winnerName).toBe("Elias");
  });
});
