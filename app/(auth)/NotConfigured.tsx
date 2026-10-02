import Link from "next/link";
import s from "./auth.module.css";

/** Shown on the auth pages when no Supabase project is connected. */
export function NotConfigured() {
  return (
    <>
      <h1 className={s.title}>Accounts aren&rsquo;t set up yet</h1>
      <p className={s.lede}>
        This copy of Redline isn&rsquo;t connected to an account system, so
        there&rsquo;s nothing to sign in to. You can still read a contract.
        Nothing gets saved between visits.
      </p>
      <p className={s.actions}>
        <Link href="/analyze" className={s.action}>
          Read a contract
        </Link>
      </p>
    </>
  );
}
