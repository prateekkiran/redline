import { describe, expect, it } from "vitest";
import { copyText } from "@/app/(app)/analyze/clipboard";

describe("copyText", () => {
  it("writes the counter-offer and reports it copied", async () => {
    const written: string[] = [];
    const outcome = await copyText("Limit the licence to this project.", {
      writeText: async (t) => void written.push(t),
    });
    expect(outcome).toBe("copied");
    expect(written).toEqual(["Limit the licence to this project."]);
  });

  it("reports a failure when the browser refuses the write", async () => {
    const outcome = await copyText("text", {
      writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
    });
    expect(outcome).toBe("failed");
  });

  it("reports a failure when there is no clipboard", async () => {
    expect(await copyText("text", undefined)).toBe("failed");
  });
});
