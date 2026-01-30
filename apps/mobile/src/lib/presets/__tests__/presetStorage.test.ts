import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCustomPresets,
  loadCustomPresets,
  saveCustomPresets
} from "../presetStorage";
import { MatchPreset } from "../types";

const createMemoryStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    }
  };
};

const samplePreset: MatchPreset = {
  id: "custom-1",
  title: "My Custom Preset",
  subtitle: "Best of 3 • TB to 7",
  rules: {
    bestOf: 3,
    tiebreakAt6All: true,
    tiebreakTo: 7,
    startingServer: "A"
  }
};

describe("presetStorage", () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    globalThis.localStorage = storage;
    (globalThis as { window?: Window }).window = {
      localStorage: storage
    } as Window;
  });

  it("returns empty array when no presets stored", () => {
    expect(loadCustomPresets()).toEqual([]);
  });

  it("saves and loads custom presets", () => {
    saveCustomPresets([samplePreset]);
    expect(loadCustomPresets()).toEqual([samplePreset]);
  });

  it("clears stored presets", () => {
    saveCustomPresets([samplePreset]);
    clearCustomPresets();
    expect(loadCustomPresets()).toEqual([]);
  });
});
