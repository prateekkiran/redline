import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDocuments, type LibraryEntry } from "@/lib/library/repository";
import { createClient, getViewer } from "@/lib/supabase/server";
import s from "../app.module.css";
import { flagCount, libraryCopy as t, savedOn } from "./copy";
import l from "./library.module.css";

export const metadata: Metadata = { title: "Library · Redline" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LibraryPage({ searchParams }: Props) {
  const viewer = await getViewer();
  if (viewer.configured && !viewer.user) redirect("/sign-in?next=/library");
  const { deleted } = await searchParams;

  let entries: LibraryEntry[] | null = null;
  if (viewer.configured) {
    try {
      entries = await listDocuments(await createClient());
    } catch (err) {
      console.error("[library] list failed", err instanceof Error ? err.message : typeof err);
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
        {deleted === "1" && viewer.configured && (
          <p className={l.notice} role="status">
            {t.deleted}
          </p>
        )}
        {!viewer.configured ? (
          <State id="library-state" head={t.notConfigured.head} body={t.notConfigured.body} action />
        ) : entries === null ? (
          <State id="library-state" head={t.loadFailed.head} body={t.loadFailed.body} />
        ) : entries.length === 0 ? (
          <State id="library-state" head={t.empty.head} body={t.empty.body} action />
        ) : (
          <ol className={l.contents} aria-label={t.listLabel}>
            {entries.map((e) => (
              <li key={e.id} className={l.entry}>
                <Link href={`/library/${e.id}`} className={l.entryLink}>
                  <span className={l.entryTitle}>{e.title}</span>
                  <span className={l.entryMeta}>
                    <time dateTime={e.createdAt}>{savedOn(e.createdAt)}</time>
                    <span>{flagCount(e.flagCount)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function State({ id, head, body, action }: { id: string; head: string; body: string; action?: boolean }) {
  return (
    <section className={s.state} aria-labelledby={id}>
      <h2 id={id} className={s.stateHead}>
        {head}
      </h2>
      <p className={s.stateBody}>{body}</p>
      {action && (
        <p className={s.stateActions}>
          <Link href="/analyze" className={s.action}>
            {t.readContract}
          </Link>
        </p>
      )}
    </section>
  );
}
