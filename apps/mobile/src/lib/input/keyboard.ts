import { useEffect } from "react";
import { InputAction, InputActionType } from "./actions";

type KeyboardControlsOptions = {
  enabled: boolean;
  onAction: (action: InputAction) => void;
};

const keyToAction: Record<string, InputActionType> = {
  a: "POINT_A",
  l: "POINT_B",
  u: "UNDO",
  r: "RESET",
  i: "TOGGLE_INPUT"
};

export const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== "object") {
    return false;
  }
  const element = target as HTMLElement;
  if (typeof element.tagName !== "string") {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }
  return element.isContentEditable === true;
};

export const useKeyboardControls = ({
  enabled,
  onAction
}: KeyboardControlsOptions): void => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (isTextInputTarget(event.target)) {
        return;
      }
      const actionType = keyToAction[event.key.toLowerCase()];
      if (!actionType) {
        return;
      }
      if (!enabled && actionType !== "TOGGLE_INPUT") {
        return;
      }
      event.preventDefault();
      onAction({ type: actionType });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onAction]);
};
