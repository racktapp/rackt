import { MatchConfig } from "../storage/matchStorage";
import { pointWonBy } from "../tennis/engine";
import { getSetWinner } from "../tennis/rules";
import { Player, TennisState } from "../tennis/types";

export type PressureType = "MATCH_POINT" | "SET_POINT" | "BREAK_POINT";

export type PressureIndicator = {
  player: Player;
  type: PressureType;
};

export const isTieBreak = (state: TennisState): boolean => state.isTiebreak;

const countSetsWon = (
  sets: TennisState["sets"],
  config: MatchConfig
) => {
  return sets.reduce(
    (acc, set) => {
      const winner = getSetWinner(set.gamesA, set.gamesB, {
        tiebreakAt6All: config.tiebreakAt6All,
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
};

export const nextPointWinsGame = (
  state: TennisState,
  player: Player
): boolean => {
  if (isTieBreak(state)) {
    return false;
  }
  const nextState = pointWonBy(state, player);
  const prevSet = state.sets[state.currentSet];
  const nextSet = nextState.sets[state.currentSet] ?? prevSet;
  const prevGames = player === "A" ? prevSet.gamesA : prevSet.gamesB;
  const nextGames = player === "A" ? nextSet.gamesA : nextSet.gamesB;
  return nextGames > prevGames;
};

export const nextPointWinsSet = (
  state: TennisState,
  player: Player,
  config: MatchConfig
): boolean => {
  const nextState = pointWonBy(state, player);
  const prevWins = countSetsWon(state.sets, config);
  const nextWins = countSetsWon(nextState.sets, config);
  return player === "A"
    ? nextWins.winsA > prevWins.winsA
    : nextWins.winsB > prevWins.winsB;
};

export const nextPointWinsMatch = (
  state: TennisState,
  player: Player,
  config: MatchConfig
): boolean => {
  const nextState = pointWonBy(state, player);
  if (nextState.matchWinner === player) {
    return true;
  }
  const neededSets = Math.ceil(config.bestOf / 2);
  const nextWins = countSetsWon(nextState.sets, config);
  return player === "A"
    ? nextWins.winsA >= neededSets
    : nextWins.winsB >= neededSets;
};

export const getPressure = (
  state: TennisState,
  config: MatchConfig
): PressureIndicator | null => {
  if (state.matchWinner) {
    return null;
  }

  const players: Player[] = ["A", "B"];

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
    if (nextPointWinsGame(state, player) && state.server !== player) {
      return { player, type: "BREAK_POINT" };
    }
  }

  return null;
};
