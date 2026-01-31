import { MatchConfig } from "../storage/matchStorage";
import { pointWonBy, TennisPadelScore } from "../scoring/engine";
import { getSetWinner } from "../tennis/rules";
import { MatchState, TeamId } from "../scoring/engine";

export type PressureType = "MATCH_POINT" | "SET_POINT" | "BREAK_POINT";

export type PressureIndicator = {
  player: TeamId;
  type: PressureType;
};

export const isTieBreak = (state: MatchState): boolean =>
  state.score.sport !== "badminton" && state.score.isTiebreak;

const isTennisPadelScore = (
  score: MatchState["score"]
): score is TennisPadelScore => score.sport !== "badminton";

const countSetsWon = (sets: TennisPadelScore["sets"], config: MatchConfig) =>
  sets.reduce(
    (acc, set) => {
      const winner = getSetWinner(set.gamesA, set.gamesB, {
        tiebreakAt6All:
          config.tiebreakAt6All ?? (config.tiebreakAt ?? 6) === 6,
        shortSetTo: config.shortSetTo
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

export const nextPointWinsGame = (
  state: MatchState,
  player: TeamId
): boolean => {
  if (!isTennisPadelScore(state.score) || isTieBreak(state)) {
    return false;
  }
  const nextState = pointWonBy(state, player);
  const prevSet = state.score.sets[state.score.currentSet];
  const nextScore = nextState.score;
  if (!isTennisPadelScore(nextScore)) {
    return false;
  }
  const nextSet = nextScore.sets[state.score.currentSet] ?? prevSet;
  const prevGames = player === "A" ? prevSet.gamesA : prevSet.gamesB;
  const nextGames = player === "A" ? nextSet.gamesA : nextSet.gamesB;
  return nextGames > prevGames;
};

export const nextPointWinsSet = (
  state: MatchState,
  player: TeamId,
  config: MatchConfig
): boolean => {
  if (!isTennisPadelScore(state.score)) {
    return false;
  }
  const nextState = pointWonBy(state, player);
  const prevWins = countSetsWon(state.score.sets, config);
  const nextScore = nextState.score;
  if (!isTennisPadelScore(nextScore)) {
    return false;
  }
  const nextWins = countSetsWon(nextScore.sets, config);
  return player === "A"
    ? nextWins.winsA > prevWins.winsA
    : nextWins.winsB > prevWins.winsB;
};

export const nextPointWinsMatch = (
  state: MatchState,
  player: TeamId,
  config: MatchConfig
): boolean => {
  const nextState = pointWonBy(state, player);
  if (nextState.score.matchWinner === player) {
    return true;
  }
  if (!isTennisPadelScore(state.score)) {
    const neededGames = config.gamesToWin ?? 2;
    const nextScore = nextState.score;
    if (isTennisPadelScore(nextScore)) {
      return false;
    }
    const gamesWonA = nextScore.games.filter(
      (game) => game.pointsA > game.pointsB
    ).length;
    const gamesWonB = nextScore.games.filter(
      (game) => game.pointsB > game.pointsA
    ).length;
    return player === "A"
      ? gamesWonA >= neededGames
      : gamesWonB >= neededGames;
  }
  const neededSets = Math.ceil((config.bestOf ?? 3) / 2);
  const nextScore = nextState.score;
  if (!isTennisPadelScore(nextScore)) {
    return false;
  }
  const nextWins = countSetsWon(nextScore.sets, config);
  return player === "A"
    ? nextWins.winsA >= neededSets
    : nextWins.winsB >= neededSets;
};

export const getPressure = (
  state: MatchState,
  config: MatchConfig
): PressureIndicator | null => {
  if (state.score.sport === "badminton") {
    return null;
  }
  if (state.score.matchWinner) {
    return null;
  }

  const players: TeamId[] = ["A", "B"];

  for (const player of players) {
    if (nextPointWinsMatch(state, player, config)) {
      return { player, type: "MATCH_POINT" };
    }
  }

  for (const player of players) {
    if (nextPointWinsSet(state, player, config)) {
      return { player, type: "SET_POINT" };
    }
  }

  for (const player of players) {
    if (
      nextPointWinsGame(state, player) &&
      state.server.type !== "badminton" &&
      state.server.order[state.server.index]?.teamId !== player
    ) {
      return { player, type: "BREAK_POINT" };
    }
  }

  return null;
};
