import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listRedLines } from "@/lib/library/red-lines";
import { createClient, getViewer } from "@/lib/supabase/server";
import s from "../app.module.css";
import type { ClientRedLine } from "./client";
import { redLinesCopy as t } from "./copy";
import { RedLinesEditor } from "./RedLinesEditor";

export const metadata: Metadata = { title: "Red lines · Redline" };

export default async function RedLinesPage() {
  // The list is per reader, so this page is never prerendered.
  await connection();
  const viewer = await getViewer();
  if (viewer.configured && !viewer.user) redirect(`/sign-in?next=${encodeURIComponent("/red-lines")}`);

  let initial: ClientRedLine[] | null = null;
  if (viewer.configured) {
    try {
      const rows = await listRedLines(await createClient());
      initial = rows.map(({ id, text }) => ({ id, text }));
    } catch (err) {
      console.error("[red-lines] page load failed", err instanceof Error ? err.message : typeof err);
    }
  }

  return (
    <div className={s.sheet}>
      <p className={s.runningHead}>
        <span>{t.heading}</span>
        <span>{t.runningHead}</span>
      </p>
      <div className={s.text}>
        <h1 className={s.title}>{t.heading}</h1>
        <p className={s.lede}>{t.lede}</p>
        {!viewer.configured ? (
          <section className={s.state} aria-labelledby="red-lines-state">
            <h2 id="red-lines-state" className={s.stateHead}>
              {t.notConfigured.head}
            </h2>
            <p className={s.stateBody}>{t.notConfigured.body}</p>
            <p className={s.stateActions}>
              <Link href="/analyze" className={s.action}>
                {t.readContract}
              </Link>
            </p>
          </section>
        ) : initial === null ? (
          <section className={s.state} aria-labelledby="red-lines-state">
            <h2 id="red-lines-state" className={s.stateHead}>
              {t.loadFailed.head}
            </h2>
            <p className={s.stateBody}>{t.loadFailed.body}</p>
          </section>
        ) : (
          <RedLinesEditor initial={initial} />
        )}
      </div>
    </div>
  );
}
