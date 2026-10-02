"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import s from "./page.module.css";
import { sampleFlags, sampleParties, sampleSections, sampleTitle } from "@/lib/sample";
import type { SampleFlag } from "@/lib/sample";

const flagByClause = new Map(sampleFlags.map((f) => [f.clause, f]));
const byRank = [...sampleFlags].sort((a, b) => a.rank - b.rank);
const clauseOrder = sampleSections.flatMap((sec) => sec.clauses.map((c) => c.number));
const byPosition = [...sampleFlags].sort(
  (a, b) => clauseOrder.indexOf(a.clause) - clauseOrder.indexOf(b.clause),
);
const WIDE = "(min-width: 900px)";
const STILL = "(prefers-reduced-motion: reduce)";
const GLOSS_GAP = 16;

type Leader = { d: string; key: number } | null;

export default function Reading({ runningHead, folio }: { runningHead: ReactNode; folio: ReactNode }) {
  const [active, setActive] = useState(1);
  const [leader, setLeader] = useState<Leader>(null);
  // Quotes start visible so the page reads without JavaScript. "waiting"
  // hides them only until the lift plays, on wide, motion-allowed screens.
  const [lift, setLift] = useState<"idle" | "waiting" | "done">("idle");
  const [landed, setLanded] = useState<Set<number>>(new Set());

  const bodyRef = useRef<HTMLDivElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const sources = useRef(new Map<number, HTMLSpanElement>());
  const glosses = useRef(new Map<number, HTMLDivElement>());
  const targets = useRef(new Map<number, HTMLParagraphElement>());
  const ranks = useRef(new Map<number, HTMLSpanElement>());

  // Hang each margin gloss level with its sentence. When the gloss above is
  // taller than its clause, open exactly that much space under the clause,
  // so every gloss stays beside the words it quotes.
  const hang = useCallback(() => {
    const body = bodyRef.current;
    const margin = marginRef.current;
    if (!body || !margin) return;
    const clauses = byPosition.map((f) => sources.current.get(f.rank)?.closest("p") ?? null);
    clauses.forEach((p) => p && (p.style.paddingBottom = ""));
    if (!window.matchMedia(WIDE).matches) {
      margin.removeAttribute("data-hung");
      body.style.minHeight = "";
      return;
    }
    margin.setAttribute("data-hung", "");
    let floor = 0;
    let previous: HTMLParagraphElement | null = null;
    byPosition.forEach((flag, i) => {
      const src = sources.current.get(flag.rank);
      const gloss = glosses.current.get(flag.rank);
      if (!src || !gloss) return;
      const top = () => src.getBoundingClientRect().top - margin.getBoundingClientRect().top;
      const short = floor - top();
      if (short > 0 && previous) {
        const base = parseFloat(getComputedStyle(previous).paddingBottom);
        previous.style.paddingBottom = `${base + short}px`;
      }
      const y = Math.max(top(), floor);
      gloss.style.top = `${y}px`;
      floor = y + gloss.offsetHeight + GLOSS_GAP;
      previous = clauses[i];
    });
    body.style.minHeight = `${floor}px`;
  }, []);

  const drawLeader = useCallback((rank: number) => {
    const body = bodyRef.current;
    const src = sources.current.get(rank);
    const mark = ranks.current.get(rank);
    if (!body || !src || !mark || !window.matchMedia(WIDE).matches) {
      setLeader(null);
      return;
    }
    const box = body.getBoundingClientRect();
    const lines = src.getClientRects();
    const last = lines[lines.length - 1];
    const to = mark.getBoundingClientRect();
    const x1 = last.right - box.left + 6;
    const y1 = last.top + last.height * 0.62 - box.top;
    const x2 = to.left - box.left - 10;
    const y2 = to.top + Math.min(to.height, 34) * 0.55 - box.top;
    const xm = Math.max(x1 + 12, x2 - 18);
    setLeader({ d: `M ${x1} ${y1} H ${xm} V ${y2} H ${x2}`, key: Date.now() });
  }, []);

  useLayoutEffect(() => {
    hang();
    const relayout = () => hang();
    window.addEventListener("resize", relayout);
    document.fonts?.ready.then(relayout);
    if (window.matchMedia(WIDE).matches && !window.matchMedia(STILL).matches) {
      setLift("waiting");
    } else {
      setLift("done");
    }
    return () => window.removeEventListener("resize", relayout);
  }, [hang]);

  useEffect(() => {
    if (lift !== "waiting") return;
    const body = bodyRef.current;
    if (!body) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        playLift(body);
      },
      { threshold: 0.2 },
    );
    observer.observe(body);
    return () => observer.disconnect();

    function playLift(container: HTMLDivElement) {
      hang();
      const origin = container.getBoundingClientRect();
      byRank.forEach((flag, i) => {
        const src = sources.current.get(flag.rank);
        const tgt = targets.current.get(flag.rank);
        if (!src || !tgt) return;
        const from = src.getBoundingClientRect();
        const to = tgt.getBoundingClientRect();

        const ghost = tgt.cloneNode(true) as HTMLElement;
        ghost.removeAttribute("id");
        ghost.setAttribute("aria-hidden", "true");
        ghost.className = `${tgt.className} ${s.ghost}`;
        ghost.style.left = `${to.left - origin.left}px`;
        ghost.style.top = `${to.top - origin.top}px`;
        ghost.style.width = `${to.width}px`;
        container.appendChild(ghost);

        const dx = from.left - to.left;
        const dy = from.top - to.top;
        const delay = i * 260;
        const travel = ghost.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
            { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px)`, opacity: 1, offset: 0.25 },
            { transform: "translate(0, 0)", opacity: 1 },
          ],
          { duration: 900, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
        );

        window.setTimeout(() => src.classList.add(s.lifting), delay);
        travel.finished.then(() => {
          ghost.remove();
          src.classList.remove(s.lifting);
          setLanded((prev) => new Set(prev).add(flag.rank));
          if (i === byRank.length - 1) setLift("done");
        });
      });
    }
  }, [lift, hang]);

  // The lift ends by ruling the leader to the top-ranked flag; after that
  // the rule follows whichever flag is being read.
  useEffect(() => {
    if (lift !== "done") return;
    const redraw = () => drawLeader(active);
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [active, lift, drawLeader]);

  const quoteHidden = (rank: number) => lift === "waiting" && !landed.has(rank);
  const select = (rank: number) => () => setActive(rank);

  return (
    <article className={s.leaf} aria-labelledby="reading">
      {runningHead}

      <div className={s.cols}>
        <div className={s.textCol}>
          <h2 id="reading" className={s.heading}>
            Read the whole agreement
          </h2>
          <p className={s.lede}>
            Five clauses here reach past the job this contract is for. They&rsquo;re ranked by how
            far they reach. Select a flag to see where it sits in the contract.
          </p>
        </div>
      </div>

      <div ref={bodyRef} className={`${s.cols} ${s.agreement}`}>
        <h3 className={s.contractTitle}>{sampleTitle}</h3>
        <p className={s.parties}>{sampleParties}</p>

        {sampleSections.map((section, si) => (
          <Fragment key={section.heading}>
            <p className={s.contractSection}>
              {si + 1}. {section.heading}
            </p>
            {section.clauses.map((clause) => {
              const flag = flagByClause.get(clause.number);
              return (
                <Fragment key={clause.number}>
                  <span className={s.num}>{clause.number}</span>
                  <p className={s.clause}>
                    {flag ? (
                      <CitedText
                        text={clause.text}
                        flag={flag}
                        isActive={active === flag.rank}
                        sourceRef={(el) => setRef(sources.current, flag.rank, el)}
                      />
                    ) : (
                      clause.text
                    )}
                  </p>
                  {flag ? (
                    // Phones: the gloss folds in beneath its clause. The
                    // sentence above is the citation, so no lemma repeats it.
                    <div
                      className={`${s.gloss} ${s.inlineGloss} ${active === flag.rank ? s.glossActive : ""}`}
                    >
                      <span className={s.rank}>{flag.rank}</span>
                      <div>
                        <p className={s.ref}>Clause {flag.clause}</p>
                        <p className={s.reading}>{flag.reading}</p>
                      </div>
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </Fragment>
        ))}

        <div ref={marginRef} className={s.marginCol} aria-label="Flags in the margin">
          {byPosition.map((flag) => (
            <div
              key={flag.rank}
              ref={(el) => setRef(glosses.current, flag.rank, el)}
              className={`${s.gloss} ${s.hungGloss} ${active === flag.rank ? s.glossActive : ""}`}
              tabIndex={0}
              role="group"
              aria-label={`Flag ${flag.rank} of ${sampleFlags.length}, clause ${flag.clause}`}
              onMouseEnter={select(flag.rank)}
              onFocus={select(flag.rank)}
              onClick={select(flag.rank)}
            >
              <span className={s.rank} ref={(el) => setRef(ranks.current, flag.rank, el)}>
                {flag.rank}
              </span>
              <div>
                <p className={s.ref}>Clause {flag.clause}</p>
                <p
                  className={`${s.lemma} ${quoteHidden(flag.rank) ? s.awaiting : ""}`}
                  ref={(el) => setRef(targets.current, flag.rank, el)}
                >
                  {flag.quote}
                  <span className={s.bracket} aria-hidden="true">
                    ]
                  </span>
                </p>
                <p className={s.reading}>{flag.reading}</p>
              </div>
            </div>
          ))}
        </div>

        {leader ? (
          <svg className={s.leader} aria-hidden="true">
            <path key={leader.key} d={leader.d} />
          </svg>
        ) : null}
      </div>

      <section className={s.variants} aria-labelledby="variants">
        <h3 id="variants" className={s.subheading}>
          Ask for this instead
        </h3>
        <ol className={s.variantList}>
          {byRank.map((flag) => (
            <li
              key={flag.rank}
              className={`${s.variant} ${active === flag.rank ? s.variantActive : ""}`}
              onMouseEnter={select(flag.rank)}
            >
              <span className={s.rank}>{flag.rank}</span>
              <div>
                <p className={s.ref}>
                  Clause {flag.clause}
                  <span className={s.bracket} aria-hidden="true">
                    ]
                  </span>
                </p>
                <p className={s.variantText}>{flag.counterOffer}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {folio}
    </article>
  );
}

function CitedText({
  text,
  flag,
  isActive,
  sourceRef,
}: {
  text: string;
  flag: SampleFlag;
  isActive: boolean;
  sourceRef: (el: HTMLSpanElement | null) => void;
}) {
  const at = text.indexOf(flag.quote);
  const before = text.slice(0, at);
  const after = text.slice(at + flag.quote.length);
  return (
    <>
      {before}
      <span ref={sourceRef} className={`${s.cited} ${isActive ? s.citedActive : ""}`}>
        {flag.quote}
      </span>
      {after}
    </>
  );
}

function setRef<T>(map: Map<number, T>, key: number, el: T | null) {
  if (el) map.set(key, el);
  else map.delete(key);
}
