import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import s from "../app.module.css";

export const metadata: Metadata = { title: "Library · Redline" };

export default async function LibraryPage() {
  const viewer = await getViewer();

  return (
    <div className={s.sheet}>
      <p className={s.runningHead}>
        <span>Library</span>
        <span>Contracts you&rsquo;ve read</span>
      </p>
      <div className={s.text}>
        <h1 className={s.title}>Library</h1>
        {viewer.configured ? (
          <section className={s.state} aria-labelledby="library-state">
            <h2 id="library-state" className={s.stateHead}>
              No documents yet
            </h2>
            <p className={s.stateBody}>
              Each contract you read is kept here with its flags and
              counter-offers, so you can reopen it without running it again.
              You can also delete it for good.
            </p>
            <p className={s.stateActions}>
              <Link href="/analyze" className={s.action}>
                Read a contract
              </Link>
            </p>
          </section>
        ) : (
          <section className={s.state} aria-labelledby="library-state">
            <h2 id="library-state" className={s.stateHead}>
              The library needs an account
            </h2>
            <p className={s.stateBody}>
              Accounts aren&rsquo;t set up on this copy of Redline yet, so
              there&rsquo;s nowhere to keep documents. You can still read a
              contract. The result just won&rsquo;t be saved.
            </p>
            <p className={s.stateActions}>
              <Link href="/analyze" className={s.action}>
                Read a contract
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
