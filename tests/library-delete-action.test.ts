import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The action runs the real repository's deleteDocument. Replaced at the
// module boundary only: the Supabase server client (no database here) and
// Next's redirect, which throws inside a request and has no request here.
const getUser = vi.fn();
const eq = vi.fn();
let deleteReply: { data: { id: string }[] | null; error: { message: string } | null };
const from = vi.fn(() => ({
  delete: () => ({
    eq: (col: string, val: string) => {
      eq(col, val);
      return { select: async () => deleteReply };
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}));
class Redirect extends Error {
  constructor(public to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { deleteSavedDocument } = await import("@/app/(app)/library/actions");

const ID = "6f1c1d0e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const form = (id: string) => {
  const f = new FormData();
  f.set("id", id);
  return f;
};
const run = (id = ID) => deleteSavedDocument({ error: null }, form(id));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  eq.mockReset();
  from.mockClear();
});

describe("deleteSavedDocument", () => {
  it("deletes the document by id and returns to the library with a notice", async () => {
    deleteReply = { data: [{ id: ID }], error: null };
    await expect(run()).rejects.toEqual(new Redirect("/library?deleted=1"));
    expect(eq).toHaveBeenCalledWith("id", ID);
  });

  it("keeps the reader on the page with a plain message when the delete fails", async () => {
    deleteReply = { data: null, error: { message: "permission denied" } };
    const state = await run();
    expect(state.error).toMatch(/couldn’t delete/);
    expect(state.error).not.toMatch(/permission/);
  });

  it("sends a signed-out caller to sign in, deleting nothing", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(run()).rejects.toBeInstanceOf(Redirect);
    expect(from).not.toHaveBeenCalled();
  });

  it("deletes nothing when accounts aren't set up", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(run()).rejects.toEqual(new Redirect("/library"));
    expect(from).not.toHaveBeenCalled();
  });
});
