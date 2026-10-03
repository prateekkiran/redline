/**
 * Q&A against the real model (ticket 07). Only a real model can show it
 * declines a question the document doesn't answer instead of filling the gap
 * from general knowledge, so this runs with `pnpm test:live` and is skipped
 * when OPENROUTER_API_KEY is unset.
 *
 * - Every answerable sidecar question gets an answer whose quote is in the
 *   document.
 * - Every unanswerable sidecar question is declined. A confident answer
 *   fails the test.
 */

import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/analysis";
import { loadFixture } from "../support/stub-model";

const TIMEOUT = 300_000;

describe.skipIf(!process.env.OPENROUTER_API_KEY)("document Q&A (live model)", () => {
  const adhesion = loadFixture("adhesion-contract");
  const questions = adhesion.sidecar.questions!;

  it(
    "answers every answerable question with a quote from the document",
    async () => {
      const results = await Promise.all(
        questions.answerable.map((q) => answerQuestion(adhesion.text, q.question)),
      );
      results.forEach((result, i) => {
        const q = questions.answerable[i];
        if (!("quote" in result)) {
          throw new Error(`Declined an answerable question: "${q.question}"`);
        }
        console.log(`Q: ${q.question}\nA: ${result.answer}\nQuote: ${result.quote}\n`);
        expect(result.answer.trim()).not.toBe("");
        expect(adhesion.text).toContain(result.quote);
      });
    },
    TIMEOUT,
  );

  it(
    "declines every question the document doesn't answer",
    async () => {
      const results = await Promise.all(
        questions.unanswerable.map((q) => answerQuestion(adhesion.text, q)),
      );
      results.forEach((result, i) => {
        if (!("declined" in result)) {
          throw new Error(
            `Answered an unanswerable question: "${questions.unanswerable[i]}" -> "${result.answer}" (quote: "${result.quote}")`,
          );
        }
        expect(result).toEqual({ declined: true });
      });
    },
    TIMEOUT,
  );
});
