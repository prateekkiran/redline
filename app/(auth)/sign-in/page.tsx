import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/auth/form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signIn } from "../actions";
import { AuthForm } from "../AuthForm";
import { NotConfigured } from "../NotConfigured";
import s from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in · Redline" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirm?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <p className={s.runningHead}>
        <span>Sign in</span>
        <span>Redline</span>
      </p>
      {isSupabaseConfigured() ? (
        <>
          <h1 className={s.title}>Sign in</h1>
          {params.confirm === "failed" ? (
            <p className={s.lede} role="alert">
              That confirmation link didn&rsquo;t work. It may have expired or
              already been used. Try signing in, or create the account again.
            </p>
          ) : null}
          <AuthForm mode="sign-in" action={signIn} next={safeNextPath(params.next)} />
          <p className={s.switch}>
            No account yet? <Link href="/sign-up">Create one</Link>
          </p>
        </>
      ) : (
        <NotConfigured />
      )}
    </>
  );
}
