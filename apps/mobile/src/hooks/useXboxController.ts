import { useCallback, useEffect, useRef, useState } from "react";

type XboxControllerCallbacks = {
  onShortA?: () => void;
  onLongA?: () => void;
  onShortB?: () => void;
  onLongB?: () => void;
  longPressMs?: number;
};

type ButtonState = {
  isPressed: boolean;
  pressedAt: number | null;
};

type ButtonStateMap = {
  a: ButtonState;
  b: ButtonState;
};

type GamepadButtonLike = {
  pressed: boolean;
};

type GamepadLike = {
  id?: string;
  buttons?: readonly GamepadButtonLike[];
};

const DEFAULT_LONG_PRESS_MS = 500;
const BUTTON_INDEX = {
  a: 0,
  b: 1
};

const getGamepads = (): Array<GamepadLike | null> => {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return [];
  }

  return navigator.getGamepads();
};

const pickGamepad = (pads: Array<GamepadLike | null>): GamepadLike | null => {
  const connectedPads = pads.filter(Boolean) as GamepadLike[];
  if (connectedPads.length === 0) {
    return null;
  }

  return (
    connectedPads.find((pad) => pad.id?.toLowerCase().includes("xbox")) ??
    connectedPads[0]
  );
};

const getPressed = (pad: GamepadLike | null, index: number): boolean => {
  if (!pad?.buttons || !pad.buttons[index]) {
    return false;
  }
  return Boolean(pad.buttons[index].pressed);
};

export const useXboxController = ({
  onShortA,
  onLongA,
  onShortB,
  onLongB,
  longPressMs = DEFAULT_LONG_PRESS_MS
}: XboxControllerCallbacks) => {
  const [isConnected, setIsConnected] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const buttonStateRef = useRef<ButtonStateMap>({
    a: { isPressed: false, pressedAt: null },
    b: { isPressed: false, pressedAt: null }
  });

  const resetButtons = useCallback(() => {
    buttonStateRef.current = {
      a: { isPressed: false, pressedAt: null },
      b: { isPressed: false, pressedAt: null }
    };
  }, []);

  const handleButton = useCallback(
    (
      key: keyof ButtonStateMap,
      isPressed: boolean,
      onShort?: () => void,
      onLong?: () => void
    ) => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const current = buttonStateRef.current[key];

      if (isPressed && !current.isPressed) {
        current.isPressed = true;
        current.pressedAt = now;
        return;
      }

      if (!isPressed && current.isPressed) {
        current.isPressed = false;
        const pressedAt = current.pressedAt ?? now;
        current.pressedAt = null;
        const duration = now - pressedAt;

        if (duration >= longPressMs) {
          onLong?.();
        } else {
          onShort?.();
        }
      }
    },
    [longPressMs]
  );

  const pollGamepad = useCallback(() => {
    const pads = getGamepads();
    const pad = pickGamepad(pads);

    if (!pad) {
      if (isConnected) {
        setIsConnected(false);
        resetButtons();
      }
      return;
    }

    if (!isConnected) {
      setIsConnected(true);
    }

    handleButton(
      "a",
      getPressed(pad, BUTTON_INDEX.a),
      onShortA,
      onLongA
    );
    handleButton(
      "b",
      getPressed(pad, BUTTON_INDEX.b),
      onShortB,
      onLongB
    );
  }, [handleButton, isConnected, onLongA, onLongB, onShortA, onShortB, resetButtons]);

  const stopPolling = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = null;
    isRunningRef.current = false;
  }, []);

  const startPolling = useCallback(() => {
    if (isRunningRef.current) {
      return;
    }
    isRunningRef.current = true;

    const tick = () => {
      pollGamepad();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [pollGamepad]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    const handleGamepadConnected = () => {
      setIsConnected(true);
      startPolling();
    };

    const handleGamepadDisconnected = () => {
      setIsConnected(false);
      resetButtons();
    };

    const hasGamepadApi = typeof navigator.getGamepads === "function";
    if (!hasGamepadApi || typeof requestAnimationFrame !== "function") {
      return;
    }

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const initialPads = getGamepads();
    const hasPad = Boolean(pickGamepad(initialPads));
    setIsConnected(hasPad);

    if (!document.hidden) {
      startPolling();
    }

    return () => {
      stopPolling();
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [resetButtons, startPolling, stopPolling]);

  return { isConnected };
};
