import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_REACH } from "@/lib/analysis/severity";
import { createStubModel, loadFixture } from "./support/stub-model";

// The red-lines routes and /api/analyze run through the real repository.
// Only the Supabase server client is replaced (no database here): each
// query records what it asked for and resolves to a scripted reply. The
// model is reached through a stubbed fetch answering from the sidecar.
type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
const ops: Op[] = [];
const replies: Partial<Record<string, { data: unknown; error: { message: string; code?: string } | null }>> = {};
const getUser = vi.fn();

function query(table: string) {
  const state: Op = { table, op: "select", filters: [] };
  ops.push(state);
  const reply = () => replies[`${table}:${state.op}`] ?? { data: null, error: null };
  const q: Record<string, unknown> = {
    select: () => q,
    order: () => q,
    eq: (col: string, val: unknown) => (state.filters.push([col, val]), q),
    insert: (payload: unknown) => ((state.op = "insert"), (state.payload = payload), q),
    update: (payload: unknown) => ((state.op = "update"), (state.payload = payload), q),
    delete: () => ((state.op = "delete"), q),
    single: async () => reply(),
    maybeSingle: async () => reply(),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(reply()).then(resolve, reject),
  };
  return q;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: query }),
}));

const listRoute = await import("@/app/api/red-lines/route");
const itemRoute = await import("@/app/api/red-lines/[id]/route");
const analyzeRoute = await import("@/app/api/analyze/route");

const ID = "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const row = (text: string, id = ID) => ({
  id,
  text,
  created_at: "2026-10-03T10:00:00.000Z",
  updated_at: "2026-10-03T10:00:00.000Z",
});
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (url: string, method: string, body: unknown) =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const adhesion = loadFixture("adhesion-contract");
const PAYMENT_LINE = "Payment later than 14 days after invoice";
const PAYMENT_SENTENCE =
  "Contractor will send invoices by email, and Client will pay each undisputed invoice within 30 days of receiving it.";
let model: ReturnType<typeof createStubModel>;

function stubOpenRouter() {
  model = createStubModel(adhesion, {
    redLineCandidates: [
      {
        redLine: PAYMENT_LINE,
        sourceSentence: PAYMENT_SENTENCE,
        reach: { ...NO_REACH, exposure: "some" },
        description: "You wait up to 30 days for each payment.",
        counterOffer: "Client will pay each undisputed invoice within 14 days of receiving it.",
      },
    ],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const content = await model.completeJson({
        schemaName: body.response_format.json_schema.name,
        system: body.messages[0].content,
        user: body.messages[1].content,
        schema: body.response_format.json_schema.schema,
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
        status: 200,
      });
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-red-lines-test");
  vi.stubEnv("OPENROUTER_MODEL", "vendor/model");
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  stubOpenRouter();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  getUser.mockReset();
  ops.length = 0;
  for (const k of Object.keys(replies)) delete replies[k];
});

describe("red-lines routes without accounts set up", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  it("answers 503 with a plain message and touches no database", async () => {
    const responses = [
      await listRoute.GET(),
      await listRoute.POST(json("http://localhost/api/red-lines", "POST", { text: "No non-competes" })),
      await itemRoute.PATCH(json(`http://localhost/api/red-lines/${ID}`, "PATCH", { text: "x" }), ctx(ID)),
      await itemRoute.DELETE(new Request(`http://localhost/api/red-lines/${ID}`, { method: "DELETE" }), ctx(ID)),
    ];
    for (const res of responses) {
      expect(res.status).toBe(503);
      expect((await res.json()).error).toMatch(/account/i);
    }
    expect(ops).toHaveLength(0);
  });
});

describe("red-lines routes signed out", () => {
  it("refuses every operation with 401", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await listRoute.GET()).status).toBe(401);
    expect(
      (await listRoute.POST(json("http://localhost/api/red-lines", "POST", { text: "No non-competes" }))).status,
    ).toBe(401);
    expect(
      (await itemRoute.PATCH(json(`http://localhost/api/red-lines/${ID}`, "PATCH", { text: "x" }), ctx(ID))).status,
    ).toBe(401);
    expect(
      (await itemRoute.DELETE(new Request(`http://localhost/api/red-lines/${ID}`, { method: "DELETE" }), ctx(ID)))
        .status,
    ).toBe(401);
    expect(ops).toHaveLength(0);
  });
});

describe("red-lines routes signed in", () => {
  it("lists the user's red lines", async () => {
    replies["red_lines:select"] = { data: [row("No non-competes")], error: null };
    const res = await listRoute.GET();
    expect(res.status).toBe(200);
    expect((await res.json()).redLines).toEqual([
      { id: ID, text: "No non-competes", createdAt: row("").created_at, updatedAt: row("").updated_at },
    ]);
  });

  it("adds a red line, stored trimmed", async () => {
    replies["red_lines:select"] = { data: [], error: null };
    replies["red_lines:insert"] = { data: row("No non-competes"), error: null };
    const res = await listRoute.POST(json("http://localhost/api/red-lines", "POST", { text: "  No   non-competes " }));
    expect(res.status).toBe(201);
    expect((await res.json()).redLine.text).toBe("No non-competes");
    expect(ops.find((o) => o.op === "insert")?.payload).toEqual({ text: "No non-competes" });
  });

  it("refuses an empty, over-long or duplicate red line, or one past the limit", async () => {
    replies["red_lines:select"] = { data: [row("No non-competes")], error: null };
    const post = (text: unknown) => listRoute.POST(json("http://localhost/api/red-lines", "POST", { text }));
    expect((await post("   ")).status).toBe(400);
    expect((await post("x".repeat(201))).status).toBe(400);
    expect((await post(42)).status).toBe(400);
    expect((await post("no NON-competes")).status).toBe(409);

    replies["red_lines:select"] = {
      data: Array.from({ length: 20 }, (_, i) => row(`Line ${i}`, `${ID.slice(0, -2)}${String(i).padStart(2, "0")}`)),
      error: null,
    };
    const full = await post("One more");
    expect(full.status).toBe(409);
    expect((await full.json()).error).toMatch(/20/);
    expect(ops.some((o) => o.op === "insert")).toBe(false);
  });

  it("edits a red line, and answers 404 for one the user can't edit", async () => {
    replies["red_lines:select"] = { data: [row("No non-competes")], error: null };
    replies["red_lines:update"] = { data: row("No non-competes after the project"), error: null };
    const res = await itemRoute.PATCH(
      json(`http://localhost/api/red-lines/${ID}`, "PATCH", { text: "No non-competes after the project" }),
      ctx(ID),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).redLine.text).toBe("No non-competes after the project");
    const update = ops.find((o) => o.op === "update")!;
    expect(update.payload).toEqual({ text: "No non-competes after the project" });
    expect(update.filters).toEqual([["id", ID]]);

    replies["red_lines:update"] = { data: null, error: null };
    const missing = await itemRoute.PATCH(
      json(`http://localhost/api/red-lines/${ID}`, "PATCH", { text: "Something else" }),
      ctx(ID),
    );
    expect(missing.status).toBe(404);
  });

  it("removes a red line, and answers 404 when there was nothing to remove", async () => {
    replies["red_lines:delete"] = { data: [{ id: ID }], error: null };
    const del = () =>
      itemRoute.DELETE(new Request(`http://localhost/api/red-lines/${ID}`, { method: "DELETE" }), ctx(ID));
    expect((await del()).status).toBe(204);
    replies["red_lines:delete"] = { data: [], error: null };
    expect((await del()).status).toBe(404);
    expect(
      (await itemRoute.DELETE(new Request("http://localhost/api/red-lines/nope", { method: "DELETE" }), ctx("nope")))
        .status,
    ).toBe(404);
  });

  it("answers 500 without the database's wording when a query fails", async () => {
    replies["red_lines:select"] = { data: null, error: { message: "relation red_lines does not exist" } };
    const res = await listRoute.GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toMatch(/relation/);
  });
});

describe("POST /api/analyze with stored red lines", () => {
  const analyze = (body: Record<string, unknown>) =>
    analyzeRoute.POST(json("http://localhost/api/analyze", "POST", { documentText: adhesion.text, ...body }));

  it("loads the signed-in user's red lines when the request has none, applies them and saves them", async () => {
    replies["red_lines:select"] = { data: [row(PAYMENT_LINE)], error: null };
    replies["documents:insert"] = { data: { id: ID }, error: null };
    const res = await analyze({});
    expect(res.status).toBe(200);
    const body = await res.json();
    const redCall = model.calls.find((c) => c.schemaName === "red_line_flags");
    expect(redCall?.user).toContain(PAYMENT_LINE);
    const added = body.flags.filter((f: { origin: string }) => f.origin === "red-line");
    expect(added).toHaveLength(1);
    expect(added[0].sourceSentence).toBe(PAYMENT_SENTENCE);
    const saved = ops.find((o) => o.table === "documents" && o.op === "insert")!.payload as {
      red_lines: string[];
      flags: unknown[];
    };
    expect(saved.red_lines).toEqual([PAYMENT_LINE]);
    expect(saved.flags).toEqual(body.flags);
  });

  it("uses the request's red lines when given, without reading the stored list", async () => {
    replies["documents:insert"] = { data: { id: ID }, error: null };
    const res = await analyze({ redLines: [`  ${PAYMENT_LINE} `, PAYMENT_LINE.toLowerCase()] });
    expect(res.status).toBe(200);
    expect(ops.some((o) => o.table === "red_lines")).toBe(false);
    const saved = ops.find((o) => o.table === "documents")!.payload as { red_lines: string[] };
    expect(saved.red_lines).toEqual([PAYMENT_LINE]);
  });

  it("doesn't run the analysis when the stored red lines can't be loaded", async () => {
    replies["red_lines:select"] = { data: null, error: { message: "timeout" } };
    const res = await analyze({});
    expect(res.status).toBe(500);
    expect(model.calls).toHaveLength(0);
  });

  it("refuses more than 20 red lines, or one over 200 characters", async () => {
    expect((await analyze({ redLines: Array.from({ length: 21 }, (_, i) => `Line ${i}`) })).status).toBe(400);
    expect((await analyze({ redLines: ["x".repeat(201)] })).status).toBe(400);
  });

  it("runs with no red lines when accounts aren't set up", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const res = await analyze({});
    expect(res.status).toBe(200);
    expect(model.calls.map((c) => c.schemaName)).not.toContain("red_line_flags");
    expect(ops).toHaveLength(0);
  });
});
