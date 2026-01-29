import { useEffect } from "react";

import { InputAction } from "./actions";

type KeyboardControlsOptions = {
  enabled: boolean;
  onAction: (action: InputAction) => void;
};

export const getActionForKey = (key: string): InputAction | null => {
  switch (key.toLowerCase()) {
    case "a":
      return { type: "POINT_A" };
    case "l":
      return { type: "POINT_B" };
    case "u":
      return { type: "UNDO" };
    case "r":
      return { type: "RESET" };
    case "i":
      return { type: "TOGGLE_INPUT" };
    default:
      return null;
  }
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== "object") {
    return false;
  }

  const element = target as {
    tagName?: string;
    isContentEditable?: boolean;
    getAttribute?: (name: string) => string | null;
  };

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  const contentEditable = element.getAttribute?.("contenteditable");
  return contentEditable === "" || contentEditable === "true";
};

export const useKeyboardControls = ({
  enabled,
  onAction
}: KeyboardControlsOptions): void => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const action = getActionForKey(event.key);
      if (!action) {
        return;
      }

      if (!enabled && action.type !== "TOGGLE_INPUT") {
        return;
      }

      event.preventDefault();
      onAction(action);
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [enabled, onAction]);
};
