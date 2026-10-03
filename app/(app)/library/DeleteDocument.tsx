"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import s from "./library.module.css";
import { deleteSavedDocument, type DeleteState } from "./actions";
import { libraryCopy } from "./copy";

const t = libraryCopy.remove;

/**
 * Delete, with the confirmation inline: the first press opens a short
 * statement that this is permanent, and only the second press deletes.
 */
export function DeleteDocument({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteSavedDocument, {
    error: null,
  });
  const questionRef = useRef<HTMLParagraphElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const questionId = useId();
  const detailId = useId();

  useEffect(() => {
    if (confirming) questionRef.current?.focus();
    else if (wasConfirming.current) openRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <button ref={openRef} type="button" className={s.textButton} onClick={() => setConfirming(true)}>
        {t.open}
      </button>
    );
  }

  return (
    <form
      action={action}
      className={s.confirm}
      role="group"
      aria-labelledby={questionId}
      aria-describedby={detailId}
    >
      <input type="hidden" name="id" value={id} />
      <p ref={questionRef} id={questionId} className={s.confirmQuestion} tabIndex={-1}>
        {t.question}
      </p>
      <p id={detailId} className={s.confirmDetail}>
        {t.detail}
      </p>
      {state.error && (
        <p className={s.confirmError} role="alert">
          {state.error}
        </p>
      )}
      <div className={s.confirmActions}>
        <button type="submit" className={s.action} disabled={pending}>
          {pending ? t.pending : t.confirm}
        </button>
        <button
          type="button"
          className={s.textButton}
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
