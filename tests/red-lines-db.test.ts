/**
 * The red_lines table's privacy rules, proven against real Postgres
 * (PGlite) with every migration applied, plus the round trip from a user's
 * stored red lines through the analysis into a saved library entry.
 */

import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyzeDocument } from "@/lib/analysis";
import { NO_REACH } from "@/lib/analysis/severity";
import {
  deriveTitle,
  fromDocumentRow,
  toInsertRow,
  type DocumentRow,
} from "@/lib/library/repository";
import { fromRedLineRow, MAX_RED_LINES, type RedLineRow } from "@/lib/library/red-lines";
import { anon, as, createTestDb, runAs, type Who } from "./support/pglite-db";
import { createStubModel, loadFixture } from "./support/stub-model";

let db: PGlite;
const alice = randomUUID();
const bob = randomUUID();
const carol = randomUUID();

const iso = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
  );

async function add(who: Who, text: string, userId?: string) {
  return runAs(db, who, async (tx) => {
    const res = userId
      ? await tx.query<RedLineRow>(
          "insert into public.red_lines (text, user_id) values ($1, $2) returning id, text, created_at, updated_at",
          [text, userId],
        )
      : await tx.query<RedLineRow>(
          "insert into public.red_lines (text) values ($1) returning id, text, created_at, updated_at",
          [text],
        );
    return fromRedLineRow(iso(res.rows[0] as Record<string, unknown>) as RedLineRow);
  });
}

async function list(who: Who) {
  return runAs(db, who, async (tx) => {
    const res = await tx.query<Record<string, unknown>>(
      "select id, text, created_at, updated_at from public.red_lines order by created_at, id",
    );
    return res.rows.map((r) => fromRedLineRow(iso(r) as RedLineRow));
  });
}

async function edit(who: Who, id: string, text: string): Promise<number> {
  return runAs(db, who, async (tx) => {
    const res = await tx.query("update public.red_lines set text = $2 where id = $1", [id, text]);
    return res.affectedRows ?? 0;
  });
}

async function remove(who: Who, id: string): Promise<number> {
  return runAs(db, who, async (tx) => {
    const res = await tx.query("delete from public.red_lines where id = $1", [id]);
    return res.affectedRows ?? 0;
  });
}

beforeAll(async () => {
  db = await createTestDb([
    { id: alice, email: "alice@example.test" },
    { id: bob, email: "bob@example.test" },
    { id: carol, email: "carol@example.test" },
  ]);
}, 30_000);

afterAll(async () => {
  await db?.close();
});

describe("red_lines table under row-level security", () => {
  it("lets the owner add, list, edit and remove red lines", async () => {
    const a = await add(as(alice), "No non-competes");
    const b = await add(as(alice), "Payment later than 14 days after invoice");
    expect((await list(as(alice))).map((r) => r.text)).toEqual([
      "No non-competes",
      "Payment later than 14 days after invoice",
    ]);

    expect(await edit(as(alice), a.id, "No non-competes after the project ends")).toBe(1);
    const edited = (await list(as(alice))).find((r) => r.id === a.id)!;
    expect(edited.text).toBe("No non-competes after the project ends");
    expect(new Date(edited.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(a.updatedAt).getTime(),
    );

    expect(await remove(as(alice), b.id)).toBe(1);
    expect((await list(as(alice))).map((r) => r.id)).toEqual([a.id]);
  });

  it("does not let another user read, edit or remove them", async () => {
    const mine = await add(as(alice), "Unpaid revision work");
    expect((await list(as(bob))).map((r) => r.id)).not.toContain(mine.id);
    expect(await edit(as(bob), mine.id, "hijacked")).toBe(0);
    expect(await remove(as(bob), mine.id)).toBe(0);
    expect((await list(as(alice))).find((r) => r.id === mine.id)?.text).toBe("Unpaid revision work");
  });

  it("does not let a user add a red line under someone else's id", async () => {
    await expect(add(as(bob), "Sneaky", alice)).rejects.toThrow();
  });

  it("does not let the owner move a red line to someone else", async () => {
    const mine = await add(as(alice), "Liability without a cap");
    await expect(
      runAs(db, as(alice), (tx) =>
        tx.query("update public.red_lines set user_id = $2 where id = $1", [mine.id, bob]),
      ),
    ).rejects.toThrow();
  });

  it("shows signed-out visitors nothing and lets them do nothing", async () => {
    await expect(list(anon)).rejects.toThrow();
    await expect(add(anon, "Anything")).rejects.toThrow();
    const owned = await list(as(alice));
    await expect(remove(anon, owned[0].id)).rejects.toThrow();
  });

  it("refuses empty and over-long red lines", async () => {
    await expect(add(as(alice), "")).rejects.toThrow();
    await expect(add(as(alice), "x".repeat(201))).rejects.toThrow();
    await expect(add(as(alice), "x".repeat(200))).resolves.toBeDefined();
  });

  it(`stops a user at ${MAX_RED_LINES} red lines`, async () => {
    for (let i = 0; i < MAX_RED_LINES; i++) await add(as(carol), `Red line ${i}`);
    await expect(add(as(carol), "One too many")).rejects.toThrow(/limit/);
    // Another user is unaffected.
    await expect(add(as(bob), "Bob's first")).resolves.toBeDefined();
  });

  it("removes a user's red lines when the account is deleted", async () => {
    const dave = randomUUID();
    await db.query("insert into auth.users (id, email) values ($1, 'dave@example.test')", [dave]);
    await add(as(dave), "No arbitration");
    await db.query("delete from auth.users where id = $1", [dave]);
    const res = await db.query<{ n: number }>(
      "select count(*)::int as n from public.red_lines where user_id = $1",
      [dave],
    );
    expect(res.rows[0].n).toBe(0);
  });
});

describe("a saved analysis records the red lines in effect", () => {
  it("stores the user's red lines with the analysis and keeps them after the list changes", async () => {
    const erin = randomUUID();
    await db.query("insert into auth.users (id, email) values ($1, 'erin@example.test')", [erin]);
    await add(as(erin), "Payment later than 14 days after invoice");
    await add(as(erin), "No non-competes");
    const inEffect = (await list(as(erin))).map((r) => r.text);

    const adhesion = loadFixture("adhesion-contract");
    const nonCompete = adhesion.sidecar.flags.find((f) => f.category === "non_compete")!;
    const payment =
      "Contractor will send invoices by email, and Client will pay each undisputed invoice within 30 days of receiving it.";
    const client = createStubModel(adhesion, {
      redLineCandidates: [
        {
          redLine: inEffect[0],
          sourceSentence: payment,
          reach: { ...NO_REACH, exposure: "some" },
          description: "You wait up to 30 days for each payment.",
          counterOffer: "Client will pay each undisputed invoice within 14 days of receiving it.",
        },
        {
          redLine: inEffect[1],
          sourceSentence: nonCompete.sentence,
          reach: { ...NO_REACH, time: "some" },
          description: "You can't work for home goods sellers.",
          counterOffer: "Contractor will not use Client's confidential information for others.",
        },
      ],
    });
    const result = await analyzeDocument(adhesion.text, inEffect, { client });

    const row = toInsertRow({
      title: deriveTitle(adhesion.text),
      documentText: adhesion.text,
      result,
      redLines: inEffect,
    });
    const id = await runAs(db, as(erin), async (tx) => {
      const res = await tx.query<{ id: string }>(
        "insert into public.documents (title, document_text, summary, flags, red_lines) values ($1, $2, $3, $4::jsonb, $5::jsonb) returning id",
        [row.title, row.document_text, row.summary, JSON.stringify(row.flags), JSON.stringify(row.red_lines)],
      );
      return res.rows[0].id;
    });

    // The user edits their list afterwards; the saved entry doesn't change.
    const current = await list(as(erin));
    await edit(as(erin), current[0].id, "Payment later than 7 days after invoice");

    const saved = await runAs(db, as(erin), async (tx) => {
      const res = await tx.query<Record<string, unknown>>(
        "select id, title, created_at, document_text, summary, flags, red_lines from public.documents where id = $1",
        [id],
      );
      return fromDocumentRow(iso(res.rows[0]) as DocumentRow);
    });
    expect(saved.redLines).toEqual(inEffect);
    expect(saved.result.flags).toEqual(result.flags);
    const added = saved.result.flags.filter((f) => f.origin === "red-line");
    expect(added.map((f) => f.redLine)).toEqual([inEffect[0]]);
    const baselineHit = saved.result.flags.find((f) => f.sourceSentence === nonCompete.sentence)!;
    expect(baselineHit.origin).toBe("baseline");
    expect(baselineHit.matchedRedLines).toEqual([inEffect[1]]);
  });
});
