import { pointWonBy, resetMatch, undo } from "../scoring/engine";
import { MatchConfig, MatchState } from "../scoring/engine";

export type InputAction =
  | { type: "POINT_A" }
  | { type: "POINT_B" }
  | { type: "UNDO" }
  | { type: "RESET"; config?: MatchConfig }
  | { type: "TOGGLE_INPUT" };

export const applyAction = (
  currentState: MatchState,
  action: InputAction
): MatchState => {
  switch (action.type) {
    case "POINT_A":
      return pointWonBy(currentState, "A");
    case "POINT_B":
      return pointWonBy(currentState, "B");
    case "UNDO":
      return undo(currentState);
    case "RESET":
      return resetMatch(currentState, action.config);
    case "TOGGLE_INPUT":
      return currentState;
    default:
      return currentState;
  }
};
