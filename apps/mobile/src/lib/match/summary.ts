import { MatchConfig } from "../storage/matchStorage";
import { getSetWinner, resolveSetGamesTo } from "../tennis/rules";
import { MatchState, TeamId } from "../scoring/engine";
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
  winnerId: TeamId | null;
  winnerName: string;
  setScores: SetSummary[];
  finalScoreString: string;
  durationSeconds: number;
  endedAt: number;
  counts: MatchSummaryCounts;
};

const countSetsWon = (state: MatchState): { winsA: number; winsB: number } => {
  if (state.score.sport === "badminton") {
    const gamesWonA = state.score.games.filter(
      (game) => game.pointsA > game.pointsB
    ).length;
    const gamesWonB = state.score.games.filter(
      (game) => game.pointsB > game.pointsA
    ).length;
    return { winsA: gamesWonA, winsB: gamesWonB };
  }
  return state.score.sets.reduce(
    (acc, set) => {
      const winner = getSetWinner(set.gamesA, set.gamesB, {
        tiebreakAt6All: state.score.tiebreakAt6All,
        shortSetTo: state.score.shortSetTo
      });
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

const sumGames = (state: MatchState): { gamesA: number; gamesB: number } => {
  if (state.score.sport === "badminton") {
    return state.score.games.reduce(
      (acc, game) => ({
        gamesA: acc.gamesA + game.pointsA,
        gamesB: acc.gamesB + game.pointsB
      }),
      { gamesA: 0, gamesB: 0 }
    );
  }
  return state.score.sets.reduce(
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
  finalState: MatchState;
  timeline: TimelineEvent[];
}): MatchSummary => {
  const matchEndEvent = timeline.find((event) => event.type === "MATCH_END");
  const endedAt = matchEndEvent?.ts ?? Date.now();
  const startTime = config.startTime ?? endedAt;
  const durationSeconds = Math.max(
    0,
    Math.floor((endedAt - startTime) / 1000)
  );

  const isBadminton = finalState.score.sport === "badminton";
  const isSuperTiebreak = Boolean(config.superTiebreakOnly);
  const setScores = isBadminton
    ? finalState.score.games.map((game, index) => ({
        setNumber: index + 1,
        gamesA: game.pointsA,
        gamesB: game.pointsB
      }))
    : isSuperTiebreak
      ? [
          {
            setNumber: 1,
            gamesA: finalState.score.tiebreakPointsA,
            gamesB: finalState.score.tiebreakPointsB
          }
        ]
      : finalState.score.sets.slice(0, finalState.score.currentSet + 1).map((set, index) => ({
          setNumber: index + 1,
          gamesA: set.gamesA,
          gamesB: set.gamesB
        }));

  const finalScoreString = setScores
    .map((set) => formatScore(set.gamesA, set.gamesB))
    .join(", ");

  const { winsA, winsB } = isSuperTiebreak && !isBadminton
    ? {
        winsA: finalState.score.matchWinner === "A" ? 1 : 0,
        winsB: finalState.score.matchWinner === "B" ? 1 : 0
      }
    : countSetsWon(finalState);
  const winnerId =
    finalState.score.matchWinner ??
    (winsA > winsB ? "A" : winsB > winsA ? "B" : null);
  const winnerName =
    winnerId === "A"
      ? config.teamA.players.map((player) => player.name).join(" / ")
      : winnerId === "B"
        ? config.teamB.players.map((player) => player.name).join(" / ")
        : "";

  const { gamesA, gamesB } = isSuperTiebreak && !isBadminton
    ? {
        gamesA: finalState.score.tiebreakPointsA,
        gamesB: finalState.score.tiebreakPointsB
      }
    : sumGames(finalState);
  const tiebreakGamesTo = resolveSetGamesTo(config.shortSetTo) + 1;
  const tiebreaksPlayed = isBadminton
    ? 0
    : isSuperTiebreak
      ? 1
      : finalState.score.sets
          .slice(0, finalState.score.currentSet + 1)
          .filter(
            (set) =>
              (set.gamesA === tiebreakGamesTo && set.gamesB === tiebreakGamesTo - 1) ||
              (set.gamesA === tiebreakGamesTo - 1 && set.gamesB === tiebreakGamesTo)
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
