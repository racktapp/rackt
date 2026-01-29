import { InputAction } from "../input/actions";
import { Player, TennisState } from "../tennis/types";

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
  player?: Player;
  label: string;
};

const setWinnerFromScore = (
  gamesA: number,
  gamesB: number
): Player | undefined => {
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

const buildEvent = (
  type: TimelineEventType,
  label: string,
  player?: Player
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
  prevState: TennisState,
  nextState: TennisState,
  action: InputAction
): TimelineEvent | null => {
  if (action.type !== "POINT_A" && action.type !== "POINT_B") {
    return null;
  }

  if (prevState.matchWinner || nextState.matchWinner) {
    if (!prevState.matchWinner && nextState.matchWinner) {
      return buildEvent(
        "MATCH_END",
        "Match won",
        nextState.matchWinner
      );
    }
  }

  if (!prevState.isTiebreak && nextState.isTiebreak) {
    return buildEvent("TIEBREAK_START", "Tie-break started");
  }

  if (nextState.currentSet > prevState.currentSet) {
    const finishedSet = nextState.sets[prevState.currentSet];
    const winner = setWinnerFromScore(
      finishedSet.gamesA,
      finishedSet.gamesB
    );
    if (winner) {
      return buildEvent("SET", "Set won", winner);
    }
  }

  if (nextState.currentSet === prevState.currentSet) {
    const prevSet = prevState.sets[prevState.currentSet];
    const nextSet = nextState.sets[nextState.currentSet];
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
  if (
    prevState.gamePointsA !== nextState.gamePointsA ||
    prevState.gamePointsB !== nextState.gamePointsB ||
    prevState.tiebreakPointsA !== nextState.tiebreakPointsA ||
    prevState.tiebreakPointsB !== nextState.tiebreakPointsB
  ) {
    return buildEvent("POINT", "Point won", player);
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
