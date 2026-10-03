import { describe, expect, it } from "vitest";
import { flagCount, savedOn } from "@/app/(app)/library/copy";

describe("savedOn", () => {
  it("writes the day a document was saved as day, month and year", () => {
    expect(savedOn("2026-10-03T10:00:00+00:00")).toBe("3 October 2026");
  });

  it("uses the UTC day, so the server and every render agree", () => {
    expect(savedOn("2026-10-03T23:30:00-02:00")).toBe("4 October 2026");
  });

  it("returns nothing for a date it can't read", () => {
    expect(savedOn("not a date")).toBe("");
  });
});

describe("flagCount", () => {
  it("says no flags, one flag, or the number", () => {
    expect(flagCount(0)).toBe("No flags");
    expect(flagCount(1)).toBe("1 flag");
    expect(flagCount(7)).toBe("7 flags");
  });
});
