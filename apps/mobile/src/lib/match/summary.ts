import { MatchConfig } from "../storage/matchStorage";
import { Player, SetScore, TennisState } from "../tennis/types";
import { TimelineEvent } from "./timeline";

export type SetSummary = {
  setNumber: number;
  gamesA: number;
  gamesB: number;
};

export type MatchSummaryCounts = {
  pointsA?: number;
  pointsB?: number;
  gamesA: number;
  gamesB: number;
  setsA: number;
  setsB: number;
  tiebreaksPlayed: number;
};

export type MatchSummary = {
  winnerId: Player | null;
  winnerName: string;
  setScores: SetSummary[];
  finalScoreString: string;
  durationSeconds: number;
  endedAt: number;
  counts: MatchSummaryCounts;
};

const isSetWin = (gamesA: number, gamesB: number): Player | undefined => {
  if (gamesA >= 6 || gamesB >= 6) {
    if (Math.abs(gamesA - gamesB) >= 2) {
      return gamesA > gamesB ? "A" : "B";
    }
  }
  if (gamesA === 7 || gamesB === 7) {
    return gamesA > gamesB ? "A" : "B";
  }
  return undefined;
};

const countSetsWon = (sets: SetScore[]): { winsA: number; winsB: number } => {
  return sets.reduce(
    (acc, set) => {
      const winner = isSetWin(set.gamesA, set.gamesB);
      if (winner === "A") {
        return { winsA: acc.winsA + 1, winsB: acc.winsB };
      }
      if (winner === "B") {
        return { winsA: acc.winsA, winsB: acc.winsB + 1 };
      }
      return acc;
    },
    { winsA: 0, winsB: 0 }
  );
};

const sumGames = (sets: SetScore[]): { gamesA: number; gamesB: number } => {
  return sets.reduce(
    (acc, set) => ({
      gamesA: acc.gamesA + set.gamesA,
      gamesB: acc.gamesB + set.gamesB
    }),
    { gamesA: 0, gamesB: 0 }
  );
};

const formatScore = (gamesA: number, gamesB: number): string =>
  `${gamesA}\u2013${gamesB}`;

export const buildMatchSummary = ({
  config,
  finalState,
  timeline
}: {
  config: MatchConfig;
  finalState: TennisState;
  timeline: TimelineEvent[];
}): MatchSummary => {
  const matchEndEvent = timeline.find((event) => event.type === "MATCH_END");
  const endedAt = matchEndEvent?.ts ?? Date.now();
  const startTime = config.startTime ?? endedAt;
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt - startTime) / 1000)
  );

  const relevantSets = finalState.sets.slice(0, finalState.currentSet + 1);
  const setScores = relevantSets.map((set, index) => ({
    setNumber: index + 1,
    gamesA: set.gamesA,
    gamesB: set.gamesB
  }));

  const finalScoreString = setScores
    .map((set) => formatScore(set.gamesA, set.gamesB))
    .join(", ");

  const { winsA, winsB } = countSetsWon(relevantSets);
  const winnerId = finalState.matchWinner ?? (winsA > winsB ? "A" : winsB > winsA ? "B" : null);
  const winnerName =
    winnerId === "A"
      ? config.playerAName
      : winnerId === "B"
        ? config.playerBName
        : "";

  const { gamesA, gamesB } = sumGames(relevantSets);
  const tiebreaksPlayed = relevantSets.filter(
    (set) =>
      (set.gamesA === 7 && set.gamesB === 6) ||
      (set.gamesA === 6 && set.gamesB === 7)
  ).length;

  const pointsA = timeline.filter(
    (event) => event.type === "POINT" && event.player === "A"
  ).length;
  const pointsB = timeline.filter(
    (event) => event.type === "POINT" && event.player === "B"
  ).length;

  return {
    winnerId,
    winnerName,
    setScores,
    finalScoreString,
    durationSeconds,
    endedAt,
    counts: {
      pointsA,
      pointsB,
      gamesA,
      gamesB,
      setsA: winsA,
      setsB: winsB,
      tiebreaksPlayed
    }
  };
};
