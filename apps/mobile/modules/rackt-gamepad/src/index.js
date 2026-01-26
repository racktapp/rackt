import { EventEmitter, requireNativeModule } from "expo-modules-core";

const RacktGamepad = requireNativeModule("RacktGamepad");
const emitter = new EventEmitter(RacktGamepad);

export { emitter };

export function getConnectedControllers() {
  return RacktGamepad.getConnectedControllers();
}

export function startDiscovery() {
  if (typeof RacktGamepad.startDiscovery === "function") {
    RacktGamepad.startDiscovery();
  }
}

export function stopDiscovery() {
  if (typeof RacktGamepad.stopDiscovery === "function") {
    RacktGamepad.stopDiscovery();
  }
}

export default RacktGamepad;
