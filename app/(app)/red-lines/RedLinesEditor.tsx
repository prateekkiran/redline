"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import shell from "../app.module.css";
import { MAX_RED_LINE_CHARS, MAX_RED_LINES, lengthLeft, redLinesClient, type ClientRedLine } from "./client";
import { redLinesCopy as t } from "./copy";
import s from "./red-lines.module.css";

type Status = { tone: "ok" | "error"; text: string } | null;

/**
 * The reader's red lines: a list they can add to, edit in place and remove
 * from. Every change goes to /api/red-lines straight away, so the list is the
 * same in the next session. Removing is immediate: it only changes what
 * future analyses look for, so there is nothing to confirm.
 */
export function RedLinesEditor({ initial }: { initial: ClientRedLine[] }) {
  const api = useMemo(() => redLinesClient(t.errors), []);
  const [lines, setLines] = useState(initial);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const addId = useId();
  const addCountId = useId();
  const editField = useRef<HTMLInputElement>(null);
  const addField = useRef<HTMLInputElement>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef<string | null>(null);

  useEffect(() => {
    if (editing) editField.current?.focus();
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = returnFocus.current;
    if (!id || editing) return;
    returnFocus.current = null;
    (editButtons.current.get(id) ?? addField.current)?.focus();
  });

  const full = lines.length >= MAX_RED_LINES;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setStatus(null);
    const out = await api.add(draft);
    setAdding(false);
    if (!out.ok) return setStatus({ tone: "error", text: out.message });
    setLines((ls) => [...ls, out.value]);
    setDraft("");
    setStatus({ tone: "ok", text: t.added(out.value.text) });
    addField.current?.focus();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(editing.id);
    setStatus(null);
    const out = await api.edit(editing.id, editing.text);
    setBusy(null);
    if (!out.ok) return setStatus({ tone: "error", text: out.message });
    setLines((ls) => ls.map((l) => (l.id === out.value.id ? out.value : l)));
    returnFocus.current = out.value.id;
    setEditing(null);
    setStatus({ tone: "ok", text: t.saved(out.value.text) });
  };

  const cancel = () => {
    if (!editing) return;
    returnFocus.current = editing.id;
    setEditing(null);
  };

  const remove = async (line: ClientRedLine) => {
    if (busy) return;
    setBusy(line.id);
    setStatus(null);
    const out = await api.remove(line.id);
    setBusy(null);
    if (!out.ok) return setStatus({ tone: "error", text: out.message });
    setLines((ls) => ls.filter((l) => l.id !== line.id));
    if (editing?.id === line.id) setEditing(null);
    returnFocus.current = "add";
    setStatus({ tone: "ok", text: t.removed(line.text) });
  };

  const left = lengthLeft(draft);
  const editLeft = editing ? lengthLeft(editing.text) : 0;

  return (
    <>
      <p className={s.additive}>{t.additive}</p>

      {lines.length === 0 ? (
        <section className={shell.state} aria-labelledby="red-lines-empty">
          <h2 id="red-lines-empty" className={shell.stateHead}>
            {t.empty.head}
          </h2>
          <p className={shell.stateBody}>{t.empty.body}</p>
          <p className={shell.example}>{t.example}</p>
        </section>
      ) : (
        <section aria-labelledby="red-lines-list">
          <h2 id="red-lines-list" className={s.listHead}>
            {t.listLabel}
          </h2>
          <ol className={s.list}>
            {lines.map((line) => (
              <li key={line.id} className={s.item}>
                {editing?.id === line.id ? (
                  <form className={s.editForm} onSubmit={save}>
                    <label className={s.srOnly} htmlFor={`edit-${line.id}`}>
                      {t.edit.field}
                    </label>
                    <input
                      ref={editField}
                      id={`edit-${line.id}`}
                      className={s.field}
                      value={editing.text}
                      maxLength={MAX_RED_LINE_CHARS}
                      aria-describedby={`edit-${line.id}-count`}
                      onChange={(e) => setEditing({ id: line.id, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancel();
                      }}
                    />
                    <p id={`edit-${line.id}-count`} className={s.count}>
                      {editLeft >= 0 ? t.remaining(editLeft) : t.over(-editLeft)}
                    </p>
                    <div className={s.controls}>
                      <button type="submit" className={s.action} disabled={busy === line.id}>
                        {busy === line.id ? t.edit.pending : t.edit.save}
                      </button>
                      <button type="button" className={s.textButton} onClick={cancel}>
                        {t.edit.cancel}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={s.row}>
                    <p className={s.text}>{line.text}</p>
                    <div className={s.controls}>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) editButtons.current.set(line.id, el);
                          else editButtons.current.delete(line.id);
                        }}
                        className={s.textButton}
                        aria-label={t.edit.label(line.text)}
                        disabled={busy !== null}
                        onClick={() => {
                          setStatus(null);
                          setEditing({ id: line.id, text: line.text });
                        }}
                      >
                        {t.edit.open}
                      </button>
                      <button
                        type="button"
                        className={s.textButton}
                        aria-label={t.remove.label(line.text)}
                        disabled={busy !== null}
                        onClick={() => void remove(line)}
                      >
                        {t.remove.button}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className={s.note}>{t.remove.note}</p>
        </section>
      )}

      <p className={status?.tone === "error" ? s.error : s.status} role={status?.tone === "error" ? "alert" : "status"}>
        {status?.text ?? ""}
      </p>

      {full ? (
        <p className={s.full}>{t.add.full}</p>
      ) : (
        <form className={s.addForm} onSubmit={add}>
          <label htmlFor={addId} className={s.addLabel}>
            {t.add.label}
          </label>
          <p id={addCountId} className={s.limit}>
            {t.add.limit} {draft ? (left >= 0 ? t.remaining(left) : t.over(-left)) : ""}
          </p>
          <div className={s.addRow}>
            <input
              ref={addField}
              id={addId}
              className={s.field}
              value={draft}
              maxLength={MAX_RED_LINE_CHARS}
              aria-describedby={addCountId}
              placeholder={t.example}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className={s.action} disabled={adding}>
              {adding ? t.add.pending : t.add.button}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
