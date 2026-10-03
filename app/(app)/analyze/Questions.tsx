"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { documentLines, lineNumberAt } from "@/lib/document/lines";
import s from "./analyze.module.css";
import { copy } from "./copy";
import { askQuestion, QUESTION_LIMIT } from "./request";

type Exchange =
  | { id: number; question: string; kind: "answered"; answer: string; quote: string }
  | { id: number; question: string; kind: "declined" };

/** The counter appears only once the question gets this close to the limit. */
const COUNTER_FROM = QUESTION_LIMIT - 100;

/**
 * Questions about the document on screen, set as margin queries: the
 * question in italic, the answer indented beneath it, then the line it rests
 * on and the quoted sentence. A decline is an answer like any other ("the
 * document doesn't say"), not an error. The exchanges last for this visit
 * only; nothing is saved.
 */
export function Questions({ documentText }: { documentText: string }) {
  const lines = useMemo(() => documentLines(documentText), [documentText]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const counterId = useId();

  const question = draft.trim();
  const canAsk = question !== "" && question.length <= QUESTION_LIMIT && pending === null;

  async function ask(e?: FormEvent) {
    e?.preventDefault();
    if (!canAsk) return;
    setError(null);
    setPending(question);
    const outcome = await askQuestion(documentText, question);
    setPending(null);
    if (outcome.kind === "failed") {
      // The draft stays so the question can be sent again.
      setError(outcome.message);
      return;
    }
    const id = nextId.current++;
    setExchanges((prev) => [
      ...prev,
      outcome.kind === "answered"
        ? { id, question, kind: "answered", answer: outcome.answer, quote: outcome.quote }
        : { id, question, kind: "declined" },
    ]);
    setDraft("");
    fieldRef.current?.focus();
  }

  // Ctrl/Cmd+Enter sends; a plain Enter is a new line, as in any textarea.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void ask(e);
  }

  const lineRef = (quote: string): string | null => {
    const start = documentText.indexOf(quote);
    if (start < 0) return null;
    const first = lineNumberAt(lines, start);
    const last = lineNumberAt(lines, start + quote.length - 1);
    if (first === null) return null;
    return last === null || last === first ? copy.flags.line(first) : copy.flags.lines(first, last);
  };

  return (
    <section className={`${s.text} ${s.questions}`} aria-labelledby="questions-heading">
      <h2 id="questions-heading" className={s.sectionHead}>
        {copy.questions.heading}
      </h2>
      <p className={s.questionsLede}>{copy.questions.lede}</p>

      {/* New exchanges are read out as they arrive. */}
      <ol className={s.queries} aria-label={copy.questions.asked} aria-live="polite" aria-relevant="additions">
        {exchanges.map((x) => {
          const where = x.kind === "answered" ? lineRef(x.quote) : null;
          return (
            <li key={x.id} className={s.query}>
              <p className={s.queryQuestion}>{x.question}</p>
              {x.kind === "answered" ? (
                <div className={s.queryAnswer}>
                  <p>{x.answer}</p>
                  {where && <p className={`${s.ref} ${s.queryRef}`}>{where}</p>}
                  <p className={s.lemma}>
                    {x.quote}
                    <span className={s.bracket} aria-hidden="true">
                      ]
                    </span>
                  </p>
                </div>
              ) : (
                <p className={s.queryAnswer}>{copy.questions.declined}</p>
              )}
            </li>
          );
        })}
      </ol>

      <p className={s.queryPending} role="status" aria-live="polite">
        {pending !== null ? copy.questions.asking : ""}
      </p>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <form className={s.ask} onSubmit={(e) => void ask(e)} aria-busy={pending !== null}>
        <label htmlFor={fieldId} className={s.fieldLabel}>
          {copy.questions.label}
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          className={`${s.paste} ${s.questionField}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={QUESTION_LIMIT}
          rows={3}
          aria-describedby={draft.length >= COUNTER_FROM ? counterId : undefined}
        />
        <div className={s.apparatus}>
          <button type="submit" className={s.action} disabled={!canAsk}>
            {copy.questions.ask}
          </button>
          {draft.length >= COUNTER_FROM && (
            <p id={counterId} className={s.note}>
              {copy.questions.remaining(Math.max(0, QUESTION_LIMIT - draft.length))}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
