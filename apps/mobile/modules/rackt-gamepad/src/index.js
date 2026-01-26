import { EventEmitter, requireNativeModule } from "expo-modules-core";

let RacktGamepad = null;

try {
  RacktGamepad = requireNativeModule("RacktGamepad");
} catch (error) {
  RacktGamepad = null;
}

const fallbackEmitter = {
  addListener: () => ({
    remove: () => {}
  })
};

const emitter = RacktGamepad ? new EventEmitter(RacktGamepad) : fallbackEmitter;
const noop = () => {};
const moduleExports = RacktGamepad
  ? { ...RacktGamepad, available: true }
  : {
      available: false,
      getConnectedControllers: async () => [],
      startDiscovery: noop,
      stopDiscovery: noop
    };

export { emitter };

export function getConnectedControllers() {
  if (typeof moduleExports.getConnectedControllers === "function") {
    return moduleExports.getConnectedControllers();
  }
  return Promise.resolve([]);
}

export function startDiscovery() {
  if (typeof moduleExports.startDiscovery === "function") {
    moduleExports.startDiscovery();
  }
}

export function stopDiscovery() {
  if (typeof moduleExports.stopDiscovery === "function") {
    moduleExports.stopDiscovery();
  }
}

export default moduleExports;
