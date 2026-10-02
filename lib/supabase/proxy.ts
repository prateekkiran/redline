import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseEnv } from "./config";

/** Paths a signed-out visitor may open. Everything else needs an account. */
export const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/auth/callback"];

/** Where a signed-in visitor lands, and where auth pages send them. */
export const APP_HOME = "/analyze";

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/**
 * Refreshes the Supabase session cookie on every request and keeps
 * signed-out visitors out of the app. With no Supabase project configured
 * there are no accounts, so nothing is gated.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  const { url, anonKey } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Nothing may run between creating the client and this call: it is what
  // refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }
    const to = request.nextUrl.clone();
    to.pathname = "/sign-in";
    to.search = "";
    to.searchParams.set("next", pathname);
    return redirectKeepingCookies(to, response);
  }

  if (signedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const to = request.nextUrl.clone();
    to.pathname = APP_HOME;
    to.search = "";
    return redirectKeepingCookies(to, response);
  }

  return response;
}

function redirectKeepingCookies(to: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(to);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
