import { describe, expect, it } from "vitest";
import { readSaveStatus } from "@/lib/library/save-status";

describe("readSaveStatus", () => {
  it("reads a save with its document id", () => {
    expect(readSaveStatus({ saved: true, documentId: "abc" })).toEqual({ saved: true, documentId: "abc" });
  });

  it("reads the no-accounts case", () => {
    expect(readSaveStatus({ saved: false, reason: "accounts not set up" })).toEqual({
      saved: false,
      reason: "accounts not set up",
    });
  });

  it("never claims a save the body doesn't prove", () => {
    const failed = { saved: false, reason: "save failed" };
    expect(readSaveStatus({ saved: true })).toEqual(failed);
    expect(readSaveStatus({ saved: true, documentId: "" })).toEqual(failed);
    expect(readSaveStatus({ summary: "x", flags: [] })).toEqual(failed);
    expect(readSaveStatus(null)).toEqual(failed);
  });
});
