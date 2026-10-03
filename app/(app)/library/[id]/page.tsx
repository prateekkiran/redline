import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDocument } from "@/lib/library/repository";
import { createClient, getViewer } from "@/lib/supabase/server";
import shell from "../../app.module.css";
import { Result } from "../../analyze/Result";
import { libraryCopy as t, savedOn } from "../copy";
import { DeleteDocument } from "../DeleteDocument";
import l from "../library.module.css";

export const metadata: Metadata = { title: "Library · Redline" };

type Props = { params: Promise<{ id: string }> };

/**
 * A saved document, reopened from the library. Everything comes from the
 * stored row: no model call is made. Questions still go to /api/ask against
 * the stored text.
 */
export default async function SavedDocumentPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.configured) notFound();
  if (!viewer.user) redirect(`/sign-in?next=${encodeURIComponent(`/library/${id}`)}`);

  // Row-level security returns nothing for another user's id.
  const saved = await getDocument(await createClient(), id);
  if (!saved) notFound();

  return (
    <div className={shell.sheet}>
      <p className={shell.runningHead}>
        <span>{t.heading}</span>
        <span>{saved.title}</span>
      </p>
      <Result
        documentText={saved.documentText}
        result={saved.result}
        source={t.saved.source(savedOn(saved.createdAt))}
        actions={
          <>
            <Link href="/library" className={l.back}>
              {t.saved.back}
            </Link>
            <DeleteDocument id={saved.id} />
          </>
        }
      />
    </div>
  );
}
