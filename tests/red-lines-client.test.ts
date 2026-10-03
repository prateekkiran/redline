import { describe, expect, it } from "vitest";
import {
  MAX_RED_LINE_CHARS,
  MAX_RED_LINES,
  RED_LINES_ENDPOINT,
  lengthLeft,
  redLinesClient,
} from "@/app/(app)/red-lines/client";
import { redLinesCopy } from "@/app/(app)/red-lines/copy";
import * as server from "@/lib/analysis/red-lines";

const ID = "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const row = { id: ID, text: "No non-competes", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body?: unknown) {
  const calls: Call[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return body === undefined
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status });
  };
  return { fn, calls };
}

const errors = redLinesCopy.errors;

describe("redLinesClient", () => {
  it("lists the red lines with a GET", async () => {
    const { fn, calls } = fakeFetch(200, { redLines: [row] });
    await expect(redLinesClient(errors, fn).list()).resolves.toEqual({
      ok: true,
      value: [{ id: ID, text: "No non-competes" }],
    });
    expect(calls[0].url).toBe(RED_LINES_ENDPOINT);
    expect(calls[0].init.method).toBe("GET");
  });

  it("adds one with a JSON POST of its text", async () => {
    const { fn, calls } = fakeFetch(201, { redLine: row });
    await expect(redLinesClient(errors, fn).add("No non-competes")).resolves.toEqual({
      ok: true,
      value: { id: ID, text: "No non-competes" },
    });
    expect(calls[0].url).toBe(RED_LINES_ENDPOINT);
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ text: "No non-competes" });
  });

  it("edits one with a PATCH to its own URL", async () => {
    const { fn, calls } = fakeFetch(200, { redLine: { ...row, text: "No exclusivity" } });
    await expect(redLinesClient(errors, fn).edit(ID, "No exclusivity")).resolves.toEqual({
      ok: true,
      value: { id: ID, text: "No exclusivity" },
    });
    expect(calls[0].url).toBe(`${RED_LINES_ENDPOINT}/${ID}`);
    expect(calls[0].init.method).toBe("PATCH");
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ text: "No exclusivity" });
  });

  it("removes one with a DELETE and reads the empty 204", async () => {
    const { fn, calls } = fakeFetch(204);
    await expect(redLinesClient(errors, fn).remove(ID)).resolves.toEqual({ ok: true, value: true });
    expect(calls[0].url).toBe(`${RED_LINES_ENDPOINT}/${ID}`);
    expect(calls[0].init.method).toBe("DELETE");
    expect(calls[0].init.body).toBeUndefined();
  });

  it("passes on the server's message for a refused red line (400)", async () => {
    const { fn } = fakeFetch(400, { error: "Keep each red line to 200 characters or fewer." });
    await expect(redLinesClient(errors, fn).add("x".repeat(201))).resolves.toEqual({
      ok: false,
      status: 400,
      message: "Keep each red line to 200 characters or fewer.",
    });
  });

  it("says accounts aren't set up when the server answers 503", async () => {
    const withBody = fakeFetch(503, { error: "Red lines need an account, and accounts aren't set up here yet." });
    const r1 = await redLinesClient(errors, withBody.fn).list();
    expect(r1).toEqual({ ok: false, status: 503, message: "Red lines need an account, and accounts aren't set up here yet." });

    const bare = fakeFetch(503);
    const r2 = await redLinesClient(errors, bare.fn).list();
    expect(r2).toEqual({ ok: false, status: 503, message: errors.notConfigured });
  });

  it("says the server couldn't be reached when fetch throws", async () => {
    const out = await redLinesClient(errors, async () => {
      throw new TypeError("Failed to fetch");
    }).remove(ID);
    expect(out).toEqual({ ok: false, status: 0, message: errors.offline });
  });

  it("doesn't take a malformed success as one", async () => {
    const { fn } = fakeFetch(200, { redLines: [{ text: "no id" }] });
    await expect(redLinesClient(errors, fn).list()).resolves.toEqual({
      ok: false,
      status: 200,
      message: errors.fallback,
    });
  });
});

describe("red-line limits on the client", () => {
  it("match the server's", () => {
    expect(MAX_RED_LINES).toBe(server.MAX_RED_LINES);
    expect(MAX_RED_LINE_CHARS).toBe(server.MAX_RED_LINE_CHARS);
  });

  it("count characters the way the server stores them", () => {
    expect(lengthLeft("  No   non-competes  ")).toBe(MAX_RED_LINE_CHARS - "No non-competes".length);
    expect(lengthLeft("x".repeat(MAX_RED_LINE_CHARS + 3))).toBe(-3);
  });
});
