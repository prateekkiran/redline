"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult, Flag } from "@/lib/analysis";
import { documentLines } from "@/lib/document/lines";
import { placeFlags, segmentLine, type Mark } from "@/lib/document/marks";
import s from "./analyze.module.css";
import { copy } from "./copy";

type Props = {
  documentText: string;
  result: AnalysisResult;
  /** Where the text came from: a PDF's name and page count, or a paste. */
  source: string;
  onReset: () => void;
};

const WIDE = "(min-width: 900px)";
const GLOSS_GAP = 16;

type Leader = { d: string; key: number } | null;

/**
 * The result of one analysis: the summary, then the document set on the
 * page with line numbers, and the flags as glosses in the outer margin,
 * ranked. Each gloss is hung level with the sentence it quotes; the gloss
 * being read turns its sentence rubric. Below 900px the margin folds in and
 * each gloss sits beneath the line where its sentence ends.
 */
export function Result({ documentText, result, source, onReset }: Props) {
  const lines = useMemo(() => documentLines(documentText), [documentText]);
  const marks = useMemo(
    () => placeFlags(documentText, lines, result.flags),
    [documentText, lines, result.flags],
  );
  const byPosition = useMemo(() => [...marks].sort((a, b) => a.start - b.start), [marks]);
  const endingOn = useMemo(() => {
    const map = new Map<number, Mark[]>();
    for (const m of marks) map.set(m.endLine, [...(map.get(m.endLine) ?? []), m]);
    return map;
  }, [marks]);

  const clean = result.flags.length === 0;
  const [active, setActive] = useState<number | null>(marks.length ? 1 : null);
  const [leader, setLeader] = useState<Leader>(null);

  const editionRef = useRef<HTMLDivElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const starts = useRef(new Map<number, HTMLSpanElement>());
  const ends = useRef(new Map<number, HTMLSpanElement>());
  const lineEls = useRef(new Map<number, HTMLLIElement>());
  const glosses = useRef(new Map<number, HTMLDivElement>());
  const numerals = useRef(new Map<number, HTMLSpanElement>());

  // Hang each gloss level with the sentence it quotes. When the gloss above
  // runs taller than the space before the next cited sentence, open that
  // much room under the line where the earlier sentence ends.
  const hang = useCallback(() => {
    const margin = marginRef.current;
    if (!margin) return;
    lineEls.current.forEach((li) => (li.style.paddingBottom = ""));
    if (!window.matchMedia(WIDE).matches) {
      margin.removeAttribute("data-hung");
      margin.style.minHeight = "";
      return;
    }
    margin.setAttribute("data-hung", "");
    let floor = 0;
    let previous: HTMLLIElement | null = null;
    for (const mark of byPosition) {
      const src = starts.current.get(mark.rank);
      const gloss = glosses.current.get(mark.rank);
      if (!src || !gloss) continue;
      const top = () => src.getBoundingClientRect().top - margin.getBoundingClientRect().top;
      const short = floor - top();
      if (short > 0 && previous) {
        const base = parseFloat(getComputedStyle(previous).paddingBottom);
        previous.style.paddingBottom = `${base + short}px`;
      }
      const y = Math.max(top(), floor);
      gloss.style.top = `${y}px`;
      floor = y + gloss.offsetHeight + GLOSS_GAP;
      previous = lineEls.current.get(mark.endLine) ?? null;
    }
    margin.style.minHeight = `${floor}px`;
  }, [byPosition]);

  // The leader rule runs from the end of the active sentence to its numeral.
  const drawLeader = useCallback(() => {
    const box = editionRef.current;
    const end = active === null ? undefined : ends.current.get(active);
    const numeral = active === null ? undefined : numerals.current.get(active);
    if (!box || !end || !numeral || !window.matchMedia(WIDE).matches) {
      setLeader(null);
      return;
    }
    const origin = box.getBoundingClientRect();
    const rects = end.getClientRects();
    const last = rects[rects.length - 1];
    if (!last) return setLeader(null);
    const to = numeral.getBoundingClientRect();
    const x1 = last.right - origin.left + 6;
    const y1 = last.top + last.height * 0.62 - origin.top;
    const x2 = to.left - origin.left - 10;
    const y2 = to.top + Math.min(to.height, 34) * 0.55 - origin.top;
    const xm = Math.max(x1 + 12, x2 - 18);
    setLeader({ d: `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`, key: Date.now() });
  }, [active]);

  useLayoutEffect(() => {
    hang();
    drawLeader();
    const relayout = () => {
      hang();
      drawLeader();
    };
    window.addEventListener("resize", relayout);
    void document.fonts?.ready.then(relayout);
    return () => window.removeEventListener("resize", relayout);
  }, [hang, drawLeader]);

  const select = (rank: number) => () => setActive(rank);
  const flagOf = (m: Mark): Flag => result.flags[m.index];
  const lineRef = (m: Mark) =>
    m.line === m.endLine ? copy.flags.line(m.line) : copy.flags.lines(m.line, m.endLine);

  const gloss = (m: Mark, where: "margin" | "inline") => (
    <div
      key={`${where}-${m.rank}`}
      ref={
        where === "margin"
          ? (el) => setRef(glosses.current, m.rank, el)
          : undefined
      }
      className={`${s.gloss} ${where === "margin" ? s.hungGloss : s.inlineGloss} ${
        active === m.rank ? s.glossActive : ""
      }`}
      tabIndex={0}
      role="group"
      aria-label={copy.flags.label(m.rank, marks.length, lineRef(m))}
      onMouseEnter={select(m.rank)}
      onFocus={select(m.rank)}
      onClick={select(m.rank)}
    >
      <span
        className={s.rank}
        aria-hidden="true"
        ref={where === "margin" ? (el) => setRef(numerals.current, m.rank, el) : undefined}
      >
        {m.rank}
      </span>
      <div>
        <p className={s.ref}>{lineRef(m)}</p>
        <p className={s.lemma}>
          {flagOf(m).sourceSentence}
          <span className={s.bracket} aria-hidden="true">
            ]
          </span>
        </p>
        <p className={s.reading}>{flagOf(m).description}</p>
      </div>
    </div>
  );

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
        {marks.length > 0 && <p className={`${s.text} ${s.flagsLede}`}>{copy.flags.lede(marks.length)}</p>}
        <div ref={editionRef} className={s.edition}>
          <ol className={s.lines}>
            {lines.map((line) => {
              if (line.kind === "blank") {
                return <li key={line.start} className={s.blank} aria-hidden="true" />;
              }
              const folded = endingOn.get(line.number) ?? [];
              return (
                <li
                  key={line.start}
                  ref={(el) => setRef(lineEls.current, line.number, el)}
                  className={s.line}
                  data-line={line.number}
                >
                  <span className={s.num} aria-hidden="true">
                    {line.number}
                  </span>
                  <span className={s.lineText}>
                    {segmentLine(line.text, line.start, marks).map((seg) => {
                      if (seg.ranks.length === 0) return <span key={seg.start}>{seg.text}</span>;
                      const isActive = active !== null && seg.ranks.includes(active);
                      return (
                        <span
                          key={seg.start}
                          ref={(el) => {
                            for (const m of marks) {
                              if (!seg.ranks.includes(m.rank)) continue;
                              if (m.start === seg.start) setRef(starts.current, m.rank, el);
                              if (m.end === seg.end) setRef(ends.current, m.rank, el);
                            }
                          }}
                          className={`${s.cited} ${isActive ? s.citedActive : ""}`}
                          onMouseEnter={select(seg.ranks[0])}
                        >
                          {seg.text}
                        </span>
                      );
                    })}
                  </span>
                  {folded.length > 0 && (
                    <div className={s.foldedGlosses}>{folded.map((m) => gloss(m, "inline"))}</div>
                  )}
                </li>
              );
            })}
          </ol>
          {clean ? (
            // The clean result (ADR 0005): the clauses stand with nothing
            // underlined, and the margin holds one note. The empty margin is
            // the result, not a gap where flags failed to load.
            <div className={`${s.margin} ${s.cleanMargin}`} data-clean-margin>
              <p className={s.cleanNote}>{copy.clean.note}</p>
            </div>
          ) : (
            <div
              ref={marginRef}
              className={s.margin}
              data-gloss-margin
              role={marks.length ? "region" : undefined}
              aria-label={marks.length ? copy.flags.marginLabel : undefined}
            >
              {marks.map((m) => gloss(m, "margin"))}
            </div>
          )}
          {leader ? (
            <svg className={s.leader} aria-hidden="true">
              <path key={leader.key} d={leader.d} />
            </svg>
          ) : null}
        </div>
      </section>

      <footer className={`${s.text} ${s.footer}`}>
        {clean && <p className={s.cleanFootnote}>{copy.clean.footnote}</p>}
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

function setRef<T>(map: Map<number, T>, key: number, el: T | null) {
  if (el) map.set(key, el);
  else map.delete(key);
}
