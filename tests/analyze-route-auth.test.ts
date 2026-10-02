import { afterEach, describe, expect, it, vi } from "vitest";

// With Supabase configured the route asks Supabase who is calling. Only the
// Supabase server client is replaced here; the route's own logic runs.
const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

const { POST } = await import("@/app/api/analyze/route");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  getUser.mockReset();
});

function request() {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentText: "1.1 Contractor will build a website." }),
  });
}

describe("POST /api/analyze with accounts set up", () => {
  it("returns 401 to a caller with no session, before any model call", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
