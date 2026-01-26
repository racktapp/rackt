import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

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

type RacktGamepadModule = {
  available?: boolean;
  getConnectedControllers?: () => Promise<ControllerInfo[]>;
  startDiscovery?: () => void;
};

const isIos = Platform.OS === "ios";
let nativeModule: RacktGamepadModule | null = null;

try {
  nativeModule = requireNativeModule("RacktGamepad");
} catch {
  nativeModule = null;
}

const fallbackModule: RacktGamepadModule = {
  available: false,
  getConnectedControllers: async () => [],
  startDiscovery: () => {}
};

const moduleExports = nativeModule ?? fallbackModule;
const isAvailable = isIos && moduleExports.available === true;
const fallbackEmitter: GamepadEmitter = {
  addListener: () => ({
    remove: () => {}
  })
};
const emitter = isAvailable
  ? (nativeModule as unknown as GamepadEmitter)
  : fallbackEmitter;

export const gamepadAvailable = isAvailable;

export const getConnectedControllers = async (): Promise<ControllerInfo[]> => {
  if (
    !isAvailable ||
    typeof moduleExports.getConnectedControllers !== "function"
  ) {
    return [];
  }
  try {
    const result = await moduleExports.getConnectedControllers();
    return result ?? [];
  } catch {
    return [];
  }
};

export const startDiscovery = () => {
  if (isAvailable && typeof moduleExports.startDiscovery === "function") {
    moduleExports.startDiscovery();
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
    if (!isAvailable) {
      return;
    }
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
