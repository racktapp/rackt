import { pointWonBy, reset, undo } from "../tennis/engine";
import { Player, TennisState } from "../tennis/types";

export type InputActionType =
  | "POINT_A"
  | "POINT_B"
  | "UNDO"
  | "RESET"
  | "TOGGLE_INPUT";

export type InputAction = {
  type: InputActionType;
  startingServer?: Player;
};

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
      return reset({
        bestOf: currentState.bestOf,
        tiebreakAt6All: currentState.tiebreakAt6All,
        startingServer: action.startingServer ?? currentState.server
      });
    default:
      return currentState;
  }
};
