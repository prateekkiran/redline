import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * The link in the confirmation email lands here with a one-time code.
 * Exchanging it sets the session cookie and the new account is signed in.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (isSupabaseConfigured() && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  const failed = new URL("/sign-in", url.origin);
  failed.searchParams.set("confirm", "failed");
  return NextResponse.redirect(failed);
}
