import { MatchPreset } from "./types";

export const DEFAULT_PRESETS: MatchPreset[] = [
  {
    id: "singles-best-of-3",
    title: "Singles • Best of 3",
    subtitle: "Standard sets, tie-break to 7 at 6–6",
    rules: {
      bestOf: 3,
      tiebreakAt6All: true,
      tiebreakTo: 7,
      startingServer: "A"
    }
  },
  {
    id: "singles-best-of-5",
    title: "Singles • Best of 5",
    subtitle: "Extended battle, classic 7-point tie-breaks",
    rules: {
      bestOf: 5,
      tiebreakAt6All: true,
      tiebreakTo: 7,
      startingServer: "A"
    }
  },
  {
    id: "super-tiebreak-match",
    title: "Super Tie-break Match",
    subtitle: "One-set match tie-break to 10 (win by 2)",
    rules: {
      bestOf: 1,
      tiebreakAt6All: true,
      tiebreakTo: 10,
      superTiebreakOnly: true,
      startingServer: "A"
    }
  },
  {
    id: "practice-first-to-4",
    title: "Practice (First to 4 games)",
    subtitle: "Short set, first to 4 games",
    rules: {
      bestOf: 1,
      tiebreakAt6All: false,
      shortSetTo: 4,
      startingServer: "A"
    }
  }
];
