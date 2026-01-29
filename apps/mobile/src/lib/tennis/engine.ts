import { MatchOptions, Player, SetScore, TennisState } from "./types";

const DEFAULT_OPTIONS: Required<MatchOptions> = {
  bestOf: 3,
  tiebreakAt6All: true
};

const otherPlayer = (player: Player): Player => (player === "A" ? "B" : "A");

const cloneSets = (sets: SetScore[]): SetScore[] =>
  sets.map((set) => ({ ...set }));

const isGameWin = (pointsA: number, pointsB: number): Player | undefined => {
  if (pointsA >= 4 || pointsB >= 4) {
    if (Math.abs(pointsA - pointsB) >= 2) {
      return pointsA > pointsB ? "A" : "B";
    }
  }
  return undefined;
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

const serverForPoint = (startServer: Player, pointNumber: number): Player => {
  if (pointNumber === 1) {
    return startServer;
  }
  const blockIndex = Math.floor((pointNumber - 2) / 2);
  return blockIndex % 2 === 0 ? otherPlayer(startServer) : startServer;
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

export const initialState = (options: MatchOptions = {}): TennisState => {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const startingServer = resolved.startingServer ?? "A";
  return {
    bestOf: resolved.bestOf,
    tiebreakAt6All: resolved.tiebreakAt6All,
    sets: [{ gamesA: 0, gamesB: 0 }],
    currentSet: 0,
    gamePointsA: 0,
    gamePointsB: 0,
    isTiebreak: false,
    tiebreakPointsA: 0,
    tiebreakPointsB: 0,
    server: startingServer
  };
};

export const reset = (options: MatchOptions = {}): TennisState =>
  initialState(options);

export const undo = (state: TennisState): TennisState => state;

const startNextSet = (state: TennisState): TennisState => {
  return {
    ...state,
    sets: [...state.sets, { gamesA: 0, gamesB: 0 }],
    currentSet: state.currentSet + 1,
    gamePointsA: 0,
    gamePointsB: 0,
    isTiebreak: false,
    tiebreakPointsA: 0,
    tiebreakPointsB: 0,
    tiebreakStartServer: undefined
  };
};

const finalizeMatchIfNeeded = (state: TennisState): TennisState => {
  const { winsA, winsB } = countSetsWon(state.sets);
  const needed = Math.ceil(state.bestOf / 2);
  if (winsA >= needed) {
    return { ...state, matchWinner: "A" };
  }
  if (winsB >= needed) {
    return { ...state, matchWinner: "B" };
  }
  return state;
};

const awardGame = (state: TennisState, winner: Player): TennisState => {
  const next = {
    ...state,
    sets: cloneSets(state.sets),
    gamePointsA: 0,
    gamePointsB: 0,
    server: otherPlayer(state.server)
  };
  const set = next.sets[next.currentSet];
  if (winner === "A") {
    set.gamesA += 1;
  } else {
    set.gamesB += 1;
  }

  const setWinner = isSetWin(set.gamesA, set.gamesB);
  if (setWinner) {
    const updated = finalizeMatchIfNeeded(next);
    if (updated.matchWinner) {
      return updated;
    }
    return startNextSet(updated);
  }

  if (next.tiebreakAt6All && set.gamesA === 6 && set.gamesB === 6) {
    return {
      ...next,
      isTiebreak: true,
      tiebreakPointsA: 0,
      tiebreakPointsB: 0,
      tiebreakStartServer: next.server,
      server: next.server
    };
  }

  return next;
};

const finishTiebreak = (state: TennisState, winner: Player): TennisState => {
  const next = {
    ...state,
    isTiebreak: false,
    tiebreakPointsA: 0,
    tiebreakPointsB: 0,
    server: state.tiebreakStartServer
      ? otherPlayer(state.tiebreakStartServer)
      : otherPlayer(state.server),
    tiebreakStartServer: undefined,
    sets: cloneSets(state.sets)
  };
  const set = next.sets[next.currentSet];
  if (winner === "A") {
    set.gamesA += 1;
  } else {
    set.gamesB += 1;
  }

  const setWinner = isSetWin(set.gamesA, set.gamesB);
  if (setWinner) {
    const updated = finalizeMatchIfNeeded(next);
    if (updated.matchWinner) {
      return updated;
    }
    return startNextSet(updated);
  }

  return next;
};

export const pointWonBy = (
  state: TennisState,
  player: Player
): TennisState => {
  if (state.matchWinner) {
    return state;
  }

  if (state.isTiebreak) {
    const next = { ...state };
    if (player === "A") {
      next.tiebreakPointsA += 1;
    } else {
      next.tiebreakPointsB += 1;
    }
    const tiebreakWinner =
      next.tiebreakPointsA >= 7 || next.tiebreakPointsB >= 7
        ? Math.abs(next.tiebreakPointsA - next.tiebreakPointsB) >= 2
          ? next.tiebreakPointsA > next.tiebreakPointsB
            ? "A"
            : "B"
          : undefined
        : undefined;

    if (tiebreakWinner) {
      return finishTiebreak(next, tiebreakWinner);
    }

    const totalPoints = next.tiebreakPointsA + next.tiebreakPointsB;
    const startServer = next.tiebreakStartServer ?? next.server;
    const nextPointNumber = totalPoints + 1;
    return {
      ...next,
      server: serverForPoint(startServer, nextPointNumber)
    };
  }

  const next = { ...state };
  if (player === "A") {
    next.gamePointsA += 1;
  } else {
    next.gamePointsB += 1;
  }

  const winner = isGameWin(next.gamePointsA, next.gamePointsB);
  if (winner) {
    return awardGame(next, winner);
  }

  return next;
};
