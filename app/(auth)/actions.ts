"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type AuthFormState,
  describeAuthError,
  readCredentials,
  safeNextPath,
} from "@/lib/auth/form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const NOT_CONFIGURED =
  "Accounts aren't set up on this copy of Redline yet.";

export async function signIn(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: NOT_CONFIGURED, email: "" };
  }
  const creds = readCredentials(form, "sign-in");
  if ("error" in creds) {
    return { status: "error", message: creds.error, email: creds.email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);
  if (error) {
    return {
      status: "error",
      message: describeAuthError("sign-in", error),
      email: creds.email,
    };
  }
  redirect(safeNextPath(form.get("next")));
}

export async function signUp(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: NOT_CONFIGURED, email: "" };
  }
  const creds = readCredentials(form, "sign-up");
  if ("error" in creds) {
    return { status: "error", message: creds.error, email: creds.email };
  }

  const origin = await siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...creds,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return {
      status: "error",
      message: describeAuthError("sign-up", error),
      email: creds.email,
    };
  }

  // With email confirmation on, Supabase hides whether the address is taken:
  // an existing account comes back as a user with no identities.
  if (data.user && data.user.identities?.length === 0) {
    return {
      status: "error",
      message: describeAuthError("sign-up", { code: "user_already_exists", message: "" }),
      email: creds.email,
    };
  }

  if (!data.session) return { status: "check-email", email: creds.email };
  redirect("/analyze");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
