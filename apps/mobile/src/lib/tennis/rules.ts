import { Player } from "./types";

export type MatchRules = {
  tiebreakAt6All: boolean;
  shortSetTo?: number;
};

export const resolveSetGamesTo = (shortSetTo?: number): number =>
  shortSetTo ?? 6;

export const resolveTiebreakTo = (tiebreakTo?: number): number =>
  tiebreakTo ?? 7;

export const getSetWinner = (
  gamesA: number,
  gamesB: number,
  rules: MatchRules
): Player | undefined => {
  const gamesToWin = resolveSetGamesTo(rules.shortSetTo);
  if (gamesA >= gamesToWin || gamesB >= gamesToWin) {
    if (Math.abs(gamesA - gamesB) >= 2) {
      return gamesA > gamesB ? "A" : "B";
    }
  }
  if (
    rules.tiebreakAt6All &&
    (gamesA === gamesToWin + 1 || gamesB === gamesToWin + 1)
  ) {
    return gamesA > gamesB ? "A" : "B";
  }
  return undefined;
};

export const shouldStartTiebreak = (
  gamesA: number,
  gamesB: number,
  rules: MatchRules
): boolean => {
  const gamesToWin = resolveSetGamesTo(rules.shortSetTo);
  return (
    rules.tiebreakAt6All && gamesA === gamesToWin && gamesB === gamesToWin
  );
};
