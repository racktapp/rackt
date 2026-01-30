import { pointWonBy, reset, undo } from "../tennis/engine";
import { MatchOptions, TennisState } from "../tennis/types";

export type InputAction =
  | { type: "POINT_A" }
  | { type: "POINT_B" }
  | { type: "UNDO" }
  | { type: "RESET"; options?: MatchOptions }
  | { type: "TOGGLE_INPUT" };

export const applyAction = (
  currentState: TennisState,
  action: InputAction
): TennisState => {
  switch (action.type) {
    case "POINT_A":
      return pointWonBy(currentState, "A");
    case "POINT_B":
      return pointWonBy(currentState, "B");
    case "UNDO":
      return undo(currentState);
    case "RESET":
      return reset(
        action.options ?? {
          bestOf: currentState.bestOf,
          tiebreakAt6All: currentState.tiebreakAt6All,
          startingServer: currentState.server,
          tiebreakTo: currentState.tiebreakTo,
          superTiebreakOnly: currentState.superTiebreakOnly,
          shortSetTo: currentState.shortSetTo
        }
      );
    case "TOGGLE_INPUT":
      return currentState;
    default:
      return currentState;
  }
};
