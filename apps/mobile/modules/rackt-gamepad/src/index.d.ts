import { EventEmitter } from "expo-modules-core";

export type ControllerInfo = {
  vendorName: string;
  productCategory: string;
};

export type GamepadButtonPayload = {
  name: string;
  pressed: boolean;
  value: number;
  vendorName: string;
  productCategory: string;
};

export type GamepadAxisPayload = {
  name: string;
  x: number;
  y: number;
  vendorName: string;
  productCategory: string;
};

export const emitter: EventEmitter;

export function getConnectedControllers(): Promise<ControllerInfo[]>;
export function startDiscovery(): void;
export function stopDiscovery(): void;

declare const RacktGamepad: {
  getConnectedControllers: () => Promise<ControllerInfo[]>;
  startDiscovery?: () => void;
  stopDiscovery?: () => void;
};

export default RacktGamepad;
