import { beforeEach, describe, expect, it } from "vitest";

import {
  defaultSettings,
  loadSettings,
  saveSettings
} from "../settings";

type StorageRecord = Record<string, string>;

const createStorage = () => {
  let store: StorageRecord = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  } as Storage;
};

describe("settings storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true
    });
  });

  it("returns defaults when storage is empty", () => {
    expect(loadSettings()).toEqual(defaultSettings);
  });

  it("hydrates stored values with defaults", () => {
    globalThis.localStorage.setItem(
      "rackt_settings",
      JSON.stringify({ theme: "dark", haptics: false })
    );

    expect(loadSettings()).toEqual({
      theme: "dark",
      haptics: false,
      sounds: false,
      pushNotifications: true
    });
  });

  it("normalizes invalid stored values", () => {
    globalThis.localStorage.setItem(
      "rackt_settings",
      JSON.stringify({ theme: "blue", haptics: "yes", sounds: true })
    );

    expect(loadSettings()).toEqual({
      theme: "system",
      haptics: true,
      sounds: true,
      pushNotifications: true
    });
  });

  it("persists normalized values", () => {
    saveSettings({
      theme: "light",
      haptics: false,
      sounds: true,
      pushNotifications: true
    });

    expect(globalThis.localStorage.getItem("rackt_settings")).toBe(
      JSON.stringify({
        theme: "light",
        haptics: false,
        sounds: true,
        pushNotifications: true
      })
    );
  });
});
