"use client";

import type { AnalysisResult } from "@/lib/analysis";
import { documentLines } from "@/lib/document/lines";
import s from "./analyze.module.css";
import { copy } from "./copy";

type Props = {
  documentText: string;
  result: AnalysisResult;
  /** Where the text came from: a PDF's name and page count, or a paste. */
  source: string;
  onReset: () => void;
};

/**
 * The result of one analysis: the summary, then the document set on the
 * page with line numbers. The edition grid keeps an outer margin column
 * (`data-gloss-margin`) for the flags that ticket 03 hangs beside the
 * sentences they quote.
 */
export function Result({ documentText, result, source, onReset }: Props) {
  const lines = documentLines(documentText);

  return (
    <article className={s.result}>
      <section className={s.text} aria-labelledby="summary-heading">
        <p className={s.reference}>{source}</p>
        <h1 id="summary-heading" className={s.title}>
          {copy.summaryHeading}
        </h1>
        <p className={s.summary}>{result.summary}</p>
      </section>

      <section className={s.documentSection} aria-labelledby="document-heading">
        <h2 id="document-heading" className={`${s.text} ${s.sectionHead}`}>
          {copy.documentHeading}
        </h2>
        <div className={s.edition}>
          <ol className={s.lines}>
            {lines.map((line) =>
              line.kind === "blank" ? (
                <li key={line.start} className={s.blank} aria-hidden="true" />
              ) : (
                <li key={line.start} className={s.line} data-line={line.number}>
                  <span className={s.num} aria-hidden="true">
                    {line.number}
                  </span>
                  <span className={s.lineText}>{line.text}</span>
                </li>
              ),
            )}
          </ol>
          <div className={s.margin} data-gloss-margin />
        </div>
      </section>

      <footer className={`${s.text} ${s.footer}`}>
        <p className={s.footerLine}>{copy.footer}</p>
        <div className={s.apparatus}>
          <button type="button" className={s.action} onClick={onReset}>
            {copy.reset}
          </button>
        </div>
      </footer>
    </article>
  );
}
