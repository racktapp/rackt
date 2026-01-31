import { InputAction } from "../input/actions";
import { getSetWinner } from "../tennis/rules";
import { MatchState, TeamId, TennisPadelScore } from "../scoring/engine";

export type TimelineEventType =
  | "POINT"
  | "GAME"
  | "SET"
  | "TIEBREAK_START"
  | "MATCH_END"
  | "UNDO";

export type TimelineEvent = {
  id: string;
  ts: number;
  type: TimelineEventType;
  player?: TeamId;
  label: string;
};

type TennisRules = Pick<TennisPadelScore, "tiebreakAt6All" | "shortSetTo">;

const isTennisPadelScore = (
  score: MatchState["score"]
): score is TennisPadelScore => score.sport !== "badminton";

const setWinnerFromScore = (
  gamesA: number,
  gamesB: number,
  state: TennisRules
): TeamId | undefined =>
  getSetWinner(gamesA, gamesB, {
    tiebreakAt6All: state.tiebreakAt6All,
    shortSetTo: state.shortSetTo
  });

const buildEvent = (
  type: TimelineEventType,
  label: string,
  player?: TeamId
): TimelineEvent => {
  const ts = Date.now();
  return {
    id: `${type}-${player ?? "none"}-${ts}`,
    ts,
    type,
    player,
    label
  };
};

export const deriveTimelineEvent = (
  prevState: MatchState,
  nextState: MatchState,
  action: InputAction
): TimelineEvent | null => {
  if (action.type !== "POINT_A" && action.type !== "POINT_B") {
    return null;
  }

  if (prevState.score.matchWinner || nextState.score.matchWinner) {
    if (!prevState.score.matchWinner && nextState.score.matchWinner) {
      return buildEvent(
        "MATCH_END",
        "Match won",
        nextState.score.matchWinner
      );
    }
  }

  if (
    isTennisPadelScore(prevState.score) &&
    isTennisPadelScore(nextState.score) &&
    !prevState.score.isTiebreak &&
    nextState.score.isTiebreak
  ) {
    return buildEvent("TIEBREAK_START", "Tie-break started");
  }

  if (!isTennisPadelScore(nextState.score)) {
    if (!isTennisPadelScore(prevState.score)) {
      if (nextState.score.currentGame > prevState.score.currentGame) {
        const finishedGame =
          nextState.score.games[prevState.score.currentGame];
        const winner =
          finishedGame?.pointsA > finishedGame?.pointsB
            ? "A"
            : finishedGame?.pointsB > finishedGame?.pointsA
              ? "B"
              : undefined;
        if (winner) {
          return buildEvent("GAME", "Game won", winner);
        }
      }
    }
  } else if (
    isTennisPadelScore(prevState.score) &&
    nextState.score.currentSet > prevState.score.currentSet
  ) {
    const finishedSet = nextState.score.sets[prevState.score.currentSet];
    const winner = setWinnerFromScore(
      finishedSet.gamesA,
      finishedSet.gamesB,
      nextState.score
    );
    if (winner) {
      return buildEvent("SET", "Set won", winner);
    }
  }

  if (
    isTennisPadelScore(nextState.score) &&
    isTennisPadelScore(prevState.score) &&
    nextState.score.currentSet === prevState.score.currentSet
  ) {
    const prevSet = prevState.score.sets[prevState.score.currentSet];
    const nextSet = nextState.score.sets[nextState.score.currentSet];
    if (
      prevSet.gamesA !== nextSet.gamesA ||
      prevSet.gamesB !== nextSet.gamesB
    ) {
      const winner =
        nextSet.gamesA > prevSet.gamesA
          ? "A"
          : nextSet.gamesB > prevSet.gamesB
            ? "B"
            : undefined;
      if (winner) {
        return buildEvent("GAME", "Game won", winner);
      }
    }
  }

  const player = action.type === "POINT_A" ? "A" : "B";
  if (!isTennisPadelScore(prevState.score) && !isTennisPadelScore(nextState.score)) {
    if (
      prevState.score.games[prevState.score.currentGame]?.pointsA !==
        nextState.score.games[nextState.score.currentGame]?.pointsA ||
      prevState.score.games[prevState.score.currentGame]?.pointsB !==
        nextState.score.games[nextState.score.currentGame]?.pointsB
    ) {
      return buildEvent("POINT", "Point won", player);
    }
  } else if (
    isTennisPadelScore(prevState.score) &&
    isTennisPadelScore(nextState.score)
  ) {
    if (
      prevState.score.gamePointsA !== nextState.score.gamePointsA ||
      prevState.score.gamePointsB !== nextState.score.gamePointsB ||
      prevState.score.tiebreakPointsA !== nextState.score.tiebreakPointsA ||
      prevState.score.tiebreakPointsB !== nextState.score.tiebreakPointsB
    ) {
      return buildEvent("POINT", "Point won", player);
    }
  }

  return null;
};

export const applyTimelineUpdate = (
  timeline: TimelineEvent[],
  action: InputAction,
  event: TimelineEvent | null
): TimelineEvent[] => {
  if (action.type === "UNDO") {
    return timeline.slice(1);
  }
  if (!event) {
    return timeline;
  }
  return [event, ...timeline];
};
