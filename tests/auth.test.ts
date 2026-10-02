import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeAuthError, readCredentials, safeNextPath } from "@/lib/auth/form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
});

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("readCredentials", () => {
  it("accepts a well-formed email and password", () => {
    expect(readCredentials(form({ email: " a@b.co ", password: "longenough" }), "sign-up")).toEqual({
      email: "a@b.co",
      password: "longenough",
    });
  });

  it("asks for both fields", () => {
    expect(readCredentials(form({ email: "a@b.co" }), "sign-in")).toMatchObject({
      error: "Enter your email and a password.",
    });
  });

  it("rejects an incomplete address and keeps what was typed", () => {
    expect(readCredentials(form({ email: "a@b", password: "x" }), "sign-in")).toEqual({
      error: "That email address doesn't look complete.",
      email: "a@b",
    });
  });

  it("enforces the password length only on sign-up", () => {
    expect(readCredentials(form({ email: "a@b.co", password: "short" }), "sign-up")).toMatchObject({
      error: "Use a password of at least 8 characters.",
    });
    expect(readCredentials(form({ email: "a@b.co", password: "short" }), "sign-in")).toEqual({
      email: "a@b.co",
      password: "short",
    });
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/library")).toBe("/library");
  });
  it.each([undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "/sign-in"])(
    "falls back for %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/analyze");
    },
  );
});

describe("describeAuthError", () => {
  it("maps wrong credentials to a plain sentence", () => {
    expect(describeAuthError("sign-in", { code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "That email and password don't match an account.",
    );
  });
  it("never passes Supabase's own message through for unknown errors", () => {
    const msg = describeAuthError("sign-up", { code: "unexpected_failure", message: "db timeout at 10.0.0.3" });
    expect(msg).not.toContain("10.0.0.3");
  });
});

describe("updateSession (proxy)", () => {
  const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));

  it("lets every path through when Supabase isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isSupabaseConfigured()).toBe(false);
    for (const path of ["/analyze", "/library", "/red-lines"]) {
      const res = await updateSession(req(path));
      expect(res.headers.get("location")).toBeNull();
      expect(res.status).toBe(200);
    }
  });

  describe("with Supabase configured and no session", () => {
    const configure = () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
    };

    it.each(["/analyze", "/library", "/red-lines", "/library/abc"])(
      "sends %s to sign-in and remembers where the visitor was going",
      async (path) => {
        configure();
        const res = await updateSession(req(path));
        const location = new URL(res.headers.get("location") ?? "", "http://x");
        expect(res.status).toBe(307);
        expect(location.pathname).toBe("/sign-in");
        expect(location.searchParams.get("next")).toBe(path);
      },
    );

    it.each(["/", "/sign-in", "/sign-up", "/auth/callback"])("lets %s through", async (path) => {
      configure();
      const res = await updateSession(req(path));
      expect(res.headers.get("location")).toBeNull();
    });

    it("answers API calls with 401 instead of a redirect", async () => {
      configure();
      const res = await updateSession(req("/api/analyze"));
      expect(res.status).toBe(401);
    });
  });
});
