import { describe, expect, it } from "vitest";

import { getActionForKey, isEditableTarget } from "../keyboard";

describe("keyboard helpers", () => {
  it("maps known keys to actions", () => {
    expect(getActionForKey("a")?.type).toBe("POINT_A");
    expect(getActionForKey("L")?.type).toBe("POINT_B");
    expect(getActionForKey("u")?.type).toBe("UNDO");
    expect(getActionForKey("r")?.type).toBe("RESET");
    expect(getActionForKey("i")?.type).toBe("TOGGLE_INPUT");
    expect(getActionForKey("x")).toBeNull();
  });

  it("detects editable targets", () => {
    expect(isEditableTarget({ tagName: "INPUT" } as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" } as EventTarget)).toBe(true);
    expect(
      isEditableTarget({ isContentEditable: true } as EventTarget)
    ).toBe(true);
    expect(isEditableTarget({ tagName: "div" } as EventTarget)).toBe(false);
  });
});
