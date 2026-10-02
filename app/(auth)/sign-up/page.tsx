import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signUp } from "../actions";
import { AuthForm } from "../AuthForm";
import { NotConfigured } from "../NotConfigured";
import s from "../auth.module.css";

export const metadata: Metadata = { title: "Create an account · Redline" };

export default function SignUpPage() {
  return (
    <>
      <p className={s.runningHead}>
        <span>Create an account</span>
        <span>Free while in early access</span>
      </p>
      {isSupabaseConfigured() ? (
        <>
          <h1 className={s.title}>Create an account</h1>
          <p className={s.lede}>
            An account keeps the contracts you&rsquo;ve read and your own red
            lines, so you can come back to them.
          </p>
          <AuthForm mode="sign-up" action={signUp} />
          <p className={s.switch}>
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
        </>
      ) : (
        <NotConfigured />
      )}
    </>
  );
}
