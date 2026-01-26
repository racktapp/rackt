import { useCallback, useEffect, useState } from "react";
import RacktGamepad from "rackt-gamepad";

type ControllerInfo = {
  vendorName: string;
  productCategory: string;
};

type GamepadConnectEvent = ControllerInfo & { type: "connect" };

type GamepadDisconnectEvent = ControllerInfo & { type: "disconnect" };

type GamepadButtonEvent = {
  type: "button";
  name: string;
  pressed: boolean;
  value: number;
  vendorName: string;
  productCategory: string;
};

type GamepadAxisEvent = {
  type: "axis";
  name: string;
  x: number;
  y: number;
  vendorName: string;
  productCategory: string;
};

export type GamepadEvent =
  | GamepadConnectEvent
  | GamepadDisconnectEvent
  | GamepadButtonEvent
  | GamepadAxisEvent;

type GamepadEmitter = {
  addListener: (
    eventName: "onConnect" | "onDisconnect" | "onButton" | "onAxis",
    listener: (payload: any) => void
  ) => { remove: () => void };
};

const emitter = RacktGamepad as unknown as GamepadEmitter;

export const getConnectedControllers = async (): Promise<ControllerInfo[]> => {
  if (typeof RacktGamepad.getConnectedControllers !== "function") {
    return [];
  }
  const result = await RacktGamepad.getConnectedControllers();
  return result ?? [];
};

export const startDiscovery = () => {
  if (typeof RacktGamepad.startDiscovery === "function") {
    RacktGamepad.startDiscovery();
  }
};

export const subscribeToGamepadEvents = (
  handler: (event: GamepadEvent) => void
) => {
  const subscriptions = [
    emitter.addListener("onConnect", (payload: ControllerInfo) => {
      handler({ type: "connect", ...payload });
    }),
    emitter.addListener("onDisconnect", (payload: ControllerInfo) => {
      handler({ type: "disconnect", ...payload });
    }),
    emitter.addListener("onButton", (payload: Omit<GamepadButtonEvent, "type">) => {
      handler({ type: "button", ...payload });
    }),
    emitter.addListener("onAxis", (payload: Omit<GamepadAxisEvent, "type">) => {
      handler({ type: "axis", ...payload });
    })
  ];

  return () => subscriptions.forEach((subscription) => subscription.remove());
};

export const useGamepad = () => {
  const [connected, setConnected] = useState<ControllerInfo[]>([]);
  const [lastEvent, setLastEvent] = useState<GamepadEvent | null>(null);
  const [buttonsDown, setButtonsDown] = useState<Record<string, boolean>>({});

  const refreshConnected = useCallback(async () => {
    try {
      const controllers = await getConnectedControllers();
      setConnected(controllers);
    } catch {
      setConnected([]);
    }
  }, []);

  useEffect(() => {
    refreshConnected();
    startDiscovery();

    const unsubscribe = subscribeToGamepadEvents((event) => {
      setLastEvent(event);
      if (event.type === "connect" || event.type === "disconnect") {
        refreshConnected();
        if (event.type === "disconnect") {
          setButtonsDown({});
        }
      }
      if (event.type === "button") {
        setButtonsDown((prev) => ({
          ...prev,
          [event.name]: event.pressed
        }));
      }
    });

    return () => unsubscribe();
  }, [refreshConnected]);

  return { connected, lastEvent, buttonsDown };
};
