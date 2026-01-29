export type Player = "A" | "B";

export type MatchOptions = {
  bestOf?: 3 | 5;
  tiebreakAt6All?: boolean;
};

export type SetScore = {
  gamesA: number;
  gamesB: number;
};

export type TennisState = {
  bestOf: 3 | 5;
  tiebreakAt6All: boolean;
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
