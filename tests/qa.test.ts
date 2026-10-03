/**
 * Q&A answered only from the document (ticket 07). The stub replaces only
 * the HTTP call; answerQuestion's grounding check (a verbatim quote found in
 * the document, or a decline) runs for real.
 */

import { describe, expect, it } from "vitest";
import {
  AnalysisInputError,
  AnalysisOutputError,
  answerQuestion,
  MAX_DOCUMENT_CHARS,
  MAX_QUESTION_CHARS,
} from "@/lib/analysis";
import { ANSWER_SCHEMA_NAME } from "@/lib/analysis/prompts";
import { createStubModel, FABRICATED_QUOTE, loadFixture } from "./support/stub-model";

const adhesion = loadFixture("adhesion-contract");
const questions = adhesion.sidecar.questions!;

describe("answerQuestion", () => {
  it("the fixture pairs the document with answerable and unanswerable questions", () => {
    expect(questions.answerable.length).toBeGreaterThan(0);
    expect(questions.unanswerable.length).toBeGreaterThan(0);
  });

  it.each(questions.answerable)("answers '$question' with a quote from the document", async (q) => {
    const client = createStubModel(adhesion);
    const result = await answerQuestion(adhesion.text, q.question, { client });
    expect(result).toEqual({ answer: q.answer, quote: q.supportingSentence });
    if (!("quote" in result)) throw new Error("expected an answer");
    expect(adhesion.text).toContain(result.quote);
    // One model call, carrying the question and the document.
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].schemaName).toBe(ANSWER_SCHEMA_NAME);
    expect(client.calls[0].user).toContain(q.question);
    expect(client.calls[0].user).toContain("Brightwater Home Goods LLC");
  });

  it.each(questions.unanswerable)("declines '%s'", async (question) => {
    const client = createStubModel(adhesion);
    expect(await answerQuestion(adhesion.text, question, { client })).toEqual({ declined: true });
  });

  it("declines a confident answer whose quote isn't in the document", async () => {
    expect(adhesion.text).not.toContain(FABRICATED_QUOTE);
    const client = createStubModel(adhesion, { fabricateAnswers: true });
    const result = await answerQuestion(adhesion.text, questions.unanswerable[0], { client });
    expect(result).toEqual({ declined: true });
  });

  it("declines an answer that paraphrases a real sentence instead of quoting it", async () => {
    const real = questions.answerable[0];
    const client = createStubModel(adhesion, {
      override: {
        [ANSWER_SCHEMA_NAME]: () => ({
          answerable: true,
          answer: real.answer,
          supportingQuote: real.supportingSentence.replace("60 percent", "sixty percent"),
        }),
      },
    });
    expect(await answerQuestion(adhesion.text, real.question, { client })).toEqual({ declined: true });
  });

  it("declines an 'answerable' reply with an empty quote", async () => {
    const real = questions.answerable[0];
    const client = createStubModel(adhesion, {
      override: {
        [ANSWER_SCHEMA_NAME]: () => ({ answerable: true, answer: real.answer, supportingQuote: "" }),
      },
    });
    expect(await answerQuestion(adhesion.text, real.question, { client })).toEqual({ declined: true });
  });

  it("declines an 'answerable' reply with an empty answer", async () => {
    const real = questions.answerable[0];
    const client = createStubModel(adhesion, {
      override: {
        [ANSWER_SCHEMA_NAME]: () => ({
          answerable: true,
          answer: "  ",
          supportingQuote: real.supportingSentence,
        }),
      },
    });
    expect(await answerQuestion(adhesion.text, real.question, { client })).toEqual({ declined: true });
  });

  it("declines when the model says the document doesn't answer, even if it wrote an answer", async () => {
    const real = questions.answerable[0];
    const client = createStubModel(adhesion, {
      override: {
        [ANSWER_SCHEMA_NAME]: () => ({
          answerable: false,
          answer: real.answer,
          supportingQuote: real.supportingSentence,
        }),
      },
    });
    expect(await answerQuestion(adhesion.text, real.question, { client })).toEqual({ declined: true });
  });

  it("returns the document's own span when the model straightened a curly quote", async () => {
    const doc = `${adhesion.text}\nClient’s approval of each page will not be unreasonably withheld.`;
    const client = createStubModel(adhesion, {
      override: {
        [ANSWER_SCHEMA_NAME]: () => ({
          answerable: true,
          answer: "Client can't unreasonably withhold approval.",
          supportingQuote: "Client's approval of each page will not be unreasonably withheld.",
        }),
      },
    });
    const result = await answerQuestion(doc, "Can the client just refuse to approve a page?", { client });
    expect(result).toEqual({
      answer: "Client can't unreasonably withhold approval.",
      quote: "Client’s approval of each page will not be unreasonably withheld.",
    });
  });

  it("throws AnalysisOutputError when the reply has no answerable field", async () => {
    const client = createStubModel(adhesion, {
      override: { [ANSWER_SCHEMA_NAME]: () => ({ answer: "yes" }) },
    });
    await expect(answerQuestion(adhesion.text, "Anything?", { client })).rejects.toBeInstanceOf(
      AnalysisOutputError,
    );
  });

  describe("input guards (no model call)", () => {
    async function rejectsWith(documentText: string, question: string, reason: string) {
      const client = createStubModel(adhesion);
      const err = await answerQuestion(documentText, question, { client }).catch((e) => e);
      expect(err).toBeInstanceOf(AnalysisInputError);
      expect((err as AnalysisInputError).reason).toBe(reason);
      expect(client.calls).toHaveLength(0);
    }

    it("refuses an empty question", () => rejectsWith(adhesion.text, "  \n ", "question_empty"));

    it("refuses a question over the limit", () =>
      rejectsWith(adhesion.text, "a".repeat(MAX_QUESTION_CHARS + 1), "question_too_long"));

    it("accepts a question at the limit", async () => {
      const client = createStubModel(adhesion);
      const result = await answerQuestion(adhesion.text, "a".repeat(MAX_QUESTION_CHARS), { client });
      expect(result).toEqual({ declined: true });
    });

    it("refuses an empty document", () => rejectsWith("   ", "When am I paid?", "empty"));

    it("refuses a document over the limit", () =>
      rejectsWith("a".repeat(MAX_DOCUMENT_CHARS + 1), "When am I paid?", "too_long"));
  });
});
