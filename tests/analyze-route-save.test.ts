import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deriveTitle } from "@/lib/library/repository";
import { createStubModel, loadFixture } from "./support/stub-model";

// With accounts set up the route saves each analysis through the real
// library repository. Only the Supabase server client is replaced (the
// database is not here); the model is reached through a stubbed fetch that
// answers from the fixture's sidecar.
const getUser = vi.fn();
const insert = vi.fn();
let insertReply: { data: { id: string } | null; error: { message: string } | null };
const from = vi.fn((table: string) => {
  void table;
  return {
    insert: (row: unknown) => {
      insert(row);
      return { select: () => ({ single: async () => insertReply }) };
    },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}));

const { POST } = await import("@/app/api/analyze/route");

const adhesion = loadFixture("adhesion-contract");
const SAVED_ID = "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

function stubOpenRouter() {
  const model = createStubModel(adhesion);
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

function post(redLines: string[] = []) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentText: adhesion.text, redLines }),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-save-test");
  vi.stubEnv("OPENROUTER_MODEL", "vendor/model");
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  stubOpenRouter();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  insert.mockReset();
  from.mockClear();
  getUser.mockReset();
});

describe("POST /api/analyze saves to the library", () => {
  it("saves the extracted text and the result, and returns the new id", async () => {
    insertReply = { data: { id: SAVED_ID }, error: null };
    const res = await POST(post(["No unpaid revisions"]));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.saved).toBe(true);
    expect(body.documentId).toBe(SAVED_ID);
    expect(body.flags.length).toBeGreaterThan(0);

    expect(from).toHaveBeenCalledWith("documents");
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0][0];
    expect(row.document_text).toBe(adhesion.text);
    expect(row.summary).toBe(body.summary);
    expect(row.flags).toEqual(body.flags);
    expect(row.red_lines).toEqual(["No unpaid revisions"]);
    expect(row.title).toBe(deriveTitle(adhesion.text));
  });

  it("still returns the analysis with a 200 when the save fails", async () => {
    insertReply = { data: null, error: { message: "relation documents does not exist" } };
    const res = await POST(post());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.saved).toBe(false);
    expect(body.reason).toBe("save failed");
    expect(body.documentId).toBeUndefined();
    expect(typeof body.summary).toBe("string");
    expect(body.flags.length).toBeGreaterThan(0);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("saves nothing when the analysis fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    const res = await POST(post());
    expect(res.status).toBe(502);
    expect(insert).not.toHaveBeenCalled();
  });
});
