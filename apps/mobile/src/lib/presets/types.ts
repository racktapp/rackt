import { TeamId } from "../scoring/engine";

export type MatchPresetRules = {
  bestOf: 1 | 3 | 5;
  tiebreakAt6All: boolean;
  tiebreakTo?: 7 | 10;
  superTiebreakOnly?: boolean;
  shortSetTo?: number;
  startingServer?: TeamId;
};

export type MatchPreset = {
  id: string;
  title: string;
  subtitle: string;
  rules: MatchPresetRules;
};
