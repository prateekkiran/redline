"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AnalysisResult } from "@/lib/analysis";
import type { SaveStatus } from "@/lib/library/save-status";
import s from "./analyze.module.css";
import { copy, refusal } from "./copy";
import { fileKind, UPLOAD_ACCEPT } from "@/lib/extract/kind";
import { submitDocument } from "./prepare";
import { Result } from "./Result";

type Phase =
  | { kind: "input" }
  | { kind: "extracting"; fileName: string }
  | { kind: "analyzing"; fromFile: boolean }
  | {
      kind: "result";
      documentText: string;
      result: AnalysisResult;
      source: string;
      save: SaveStatus;
    };

/**
 * Add a document, then read the result. A PDF or .docx is parsed here, in
 * the browser; only the text it yields is posted to the server.
 */
export function Analyze() {
  const [phase, setPhase] = useState<Phase>({ kind: "input" });
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const uploadNoteId = useId();

  async function analyze(documentText: string, source: string, fromFile = false) {
    const outcome = await submitDocument(documentText, {
      onSend: () => {
        setError(null);
        setPhase({ kind: "analyzing", fromFile });
      },
    });
    if ("kind" in outcome) {
      setPhase({ kind: "input" });
      setError(refusal[outcome.reason]);
    } else if (outcome.ok) {
      setPhase({ kind: "result", documentText, result: outcome.result, source, save: outcome.save });
    } else {
      setPhase({ kind: "input" });
      setError(outcome.message);
    }
  }

  function onPaste(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void analyze(pasted, copy.pasted);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    const kind = fileKind(file);
    if (kind === "unsupported") {
      setPhase({ kind: "input" });
      setError(copy.unsupported);
      return;
    }
    setError(null);
    setPhase({ kind: "extracting", fileName: file.name });
    // Each extractor is loaded on demand, so neither pdf.js nor mammoth is in
    // the initial bundle or the server bundle. Only the extracted text goes
    // on to submitDocument; the file itself is never sent.
    if (kind === "pdf") {
      const { extractPdfText, PdfExtractError } = await import("@/lib/extract/pdf");
      try {
        const { text, pageCount } = await extractPdfText(file);
        await analyze(text, copy.fromPdf(file.name, pageCount), true);
      } catch (err) {
        setPhase({ kind: "input" });
        setError(err instanceof PdfExtractError ? copy.pdf[err.reason] : copy.pdf.unreadable);
      }
      return;
    }
    const { extractDocxFile, DocxExtractError } = await import("@/lib/extract/docx");
    try {
      const text = await extractDocxFile(file);
      await analyze(text, copy.fromDocx(file.name), true);
    } catch (err) {
      setPhase({ kind: "input" });
      setError(err instanceof DocxExtractError ? copy.docx[err.reason] : copy.docx.unreadable);
    }
  }

  if (phase.kind === "result") {
    return (
      <Result
        documentText={phase.documentText}
        result={phase.result}
        source={phase.source}
        saveNote={saveNote(phase.save)}
        onReset={() => {
          setPasted("");
          setPhase({ kind: "input" });
        }}
      />
    );
  }

  const busy = phase.kind !== "input";

  return (
    <div className={s.text}>
      <h1 className={s.title}>{copy.heading}</h1>
      <p className={s.lede}>{copy.lede}</p>

      {busy ? (
        <section className={s.state} aria-live="polite" aria-busy="true">
          <h2 className={s.stateHead}>{copy.analyzingHead}</h2>
          <p className={s.stateBody}>
            {phase.kind === "extracting"
              ? copy.extracting(phase.fileName)
              : phase.fromFile
                ? copy.analyzingBodyFile
                : copy.analyzingBody}
          </p>
        </section>
      ) : (
        <>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}

          <form className={s.add} onSubmit={onPaste}>
            <label htmlFor={pasteId} className={s.fieldLabel}>
              {copy.pasteLabel}
            </label>
            <textarea
              id={pasteId}
              className={s.paste}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={12}
              spellCheck={false}
            />
            <div className={s.apparatus}>
              <button type="submit" className={s.action}>
                {copy.pasteButton}
              </button>
            </div>
          </form>

          <div className={s.upload}>
            <p className={s.fieldLabel}>{copy.uploadLabel}</p>
            <div className={s.apparatus}>
              <label className={s.fileAction}>
                <input
                  ref={fileRef}
                  type="file"
                  accept={UPLOAD_ACCEPT}
                  className={s.fileInput}
                  aria-describedby={uploadNoteId}
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                {copy.uploadButton}
              </label>
              <p id={uploadNoteId} className={s.note}>
                {copy.uploadNote}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function saveNote(save: SaveStatus) {
  if (save.saved) {
    return {
      tone: "quiet" as const,
      text: (
        <>
          {copy.save.savedBefore}
          <Link href={`/library/${save.documentId}`}>{copy.save.savedLink}</Link>
          {copy.save.savedAfter}
        </>
      ),
    };
  }
  return save.reason === "accounts not set up"
    ? { tone: "quiet" as const, text: copy.save.notConfigured }
    : { tone: "plain" as const, text: copy.save.failed };
}
