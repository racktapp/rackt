import { describe, expect, it } from "vitest";
import { isTextInputTarget } from "../keyboard";

describe("isTextInputTarget", () => {
  it("returns true for input-like elements", () => {
    expect(isTextInputTarget({ tagName: "INPUT" } as HTMLElement)).toBe(true);
    expect(isTextInputTarget({ tagName: "textarea" } as HTMLElement)).toBe(
      true
    );
    expect(isTextInputTarget({ tagName: "select" } as HTMLElement)).toBe(true);
  });

  it("returns true for content editable targets", () => {
    expect(
      isTextInputTarget({
        tagName: "div",
        isContentEditable: true
      } as HTMLElement)
    ).toBe(true);
  });

  it("returns false for non-input targets", () => {
    expect(isTextInputTarget({ tagName: "div" } as HTMLElement)).toBe(false);
    expect(isTextInputTarget(null)).toBe(false);
  });
});
