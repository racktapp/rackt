export type Player = "A" | "B";

export type MatchOptions = {
  bestOf?: 1 | 3 | 5;
  tiebreakAt6All?: boolean;
  startingServer?: Player;
  tiebreakTo?: 7 | 10;
  superTiebreakOnly?: boolean;
  shortSetTo?: number;
};

export type SetScore = {
  gamesA: number;
  gamesB: number;
};

export type TennisState = {
  bestOf: 1 | 3 | 5;
  tiebreakAt6All: boolean;
  tiebreakTo: 7 | 10;
  superTiebreakOnly?: boolean;
  shortSetTo?: number;
  sets: SetScore[];
  currentSet: number;
  gamePointsA: number;
  gamePointsB: number;
  isTiebreak: boolean;
  tiebreakPointsA: number;
  tiebreakPointsB: number;
  tiebreakStartServer?: Player;
  server: Player;
  matchWinner?: Player;
};
