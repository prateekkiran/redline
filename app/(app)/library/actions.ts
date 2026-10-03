"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteDocument } from "@/lib/library/repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { libraryCopy } from "./copy";

export type DeleteState = { error: string | null };

/** Where the library lands after a delete; the page reads `deleted`. */
const AFTER_DELETE = "/library?deleted=1";

/**
 * Deletes one saved document for good, as the signed-in user: row-level
 * security decides whether it is theirs. Then back to the library with a
 * short notice. A document that was already gone lands there too.
 */
export async function deleteSavedDocument(
  _prev: DeleteState,
  form: FormData,
): Promise<DeleteState> {
  if (!isSupabaseConfigured()) redirect("/library");
  const id = form.get("id");
  if (typeof id !== "string") return { error: libraryCopy.remove.failed };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/sign-in?next=${encodeURIComponent(`/library/${id}`)}`);

  try {
    await deleteDocument(supabase, id);
  } catch (err) {
    console.error("[library] delete failed", err instanceof Error ? err.message : typeof err);
    return { error: libraryCopy.remove.failed };
  }
  revalidatePath("/library");
  redirect(AFTER_DELETE);
}
