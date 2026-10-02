import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import s from "../app.module.css";

export const metadata: Metadata = { title: "Red lines · Redline" };

export default async function RedLinesPage() {
  const viewer = await getViewer();

  return (
    <div className={s.sheet}>
      <p className={s.runningHead}>
        <span>Red lines</span>
        <span>Your own rules</span>
      </p>
      <div className={s.text}>
        <h1 className={s.title}>Red lines</h1>
        <p className={s.lede}>
          A red line is something you won&rsquo;t agree to. Redline flags any
          clause that crosses one, and keeps every flag it would have raised
          anyway.
        </p>
        {viewer.configured ? (
          <section className={s.state} aria-labelledby="red-lines-state">
            <h2 id="red-lines-state" className={s.stateHead}>
              You haven&rsquo;t added any red lines
            </h2>
            <p className={s.stateBody}>
              Until you add one, Redline reads contracts with its standard
              checks only.
            </p>
            <p className={s.example}>
              For example: no non-compete longer than six months.
            </p>
          </section>
        ) : (
          <section className={s.state} aria-labelledby="red-lines-state">
            <h2 id="red-lines-state" className={s.stateHead}>
              Red lines need an account
            </h2>
            <p className={s.stateBody}>
              Your red lines are kept with your account, and accounts
              aren&rsquo;t set up on this copy of Redline yet. Redline still
              reads contracts with its standard checks.
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
