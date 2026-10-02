/**
 * Turns the text items a PDF reader returns into document text. Pure and
 * deterministic: the same items always give the same string, so the
 * sentences a flag later quotes are exact substrings of what was sent.
 *
 * Conservative by design. Whitespace is collapsed only within a line; line
 * breaks inside a paragraph are joined so a wrapped sentence stays whole;
 * a vertical gap, a list number or a line ending a sentence keeps its break.
 * Nothing is reworded, reordered or dropped.
 */

/** The subset of a pdf.js TextItem this module needs. */
export type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  /** pdf.js transform matrix [a, b, c, d, x, y]. */
  transform?: number[];
  width?: number;
  height?: number;
};

type Line = {
  text: string;
  y?: number;
  height?: number;
  /** Right edge of the line's last item. */
  end?: number;
  /** Estimated width of the line's first word plus the space before it. */
  lead?: number;
};

/** Starts that mark a new paragraph even with no vertical gap. */
const BLOCK_START =
  /^(?:\d+(?:\.\d+)+\.?\s|\d+[.)]\s|\([a-z0-9]{1,3}\)\s|[•·▪◦*–—-]\s)/i;

/**
 * A line ending one of these ends its sentence; keep the break. Colons and
 * semicolons are left out on purpose: a sentence often wraps after one.
 */
const SENTENCE_END = /[.!?]["”’)\]]*$/;

/** A gap this many times the line height, or more, is a paragraph break. */
const PARAGRAPH_GAP = 1.6;

export function pageItemsToLines(items: PdfTextItem[]): Line[] {
  const lines: Line[] = [];
  let current = "";
  let y: number | undefined;
  let height: number | undefined;
  let prevEnd: number | undefined;
  let charWidth: number | undefined;
  let inkWidth = 0;
  let inkChars = 0;

  const flush = () => {
    const text = collapse(current);
    if (text !== "") {
      const firstWord = text.split(" ")[0];
      // Two characters of slack: proportional fonts make this an estimate,
      // and a wrongly kept break splits a sentence.
      const lead = charWidth !== undefined ? (firstWord.length + 3) * charWidth : undefined;
      lines.push({ text, y, height, end: prevEnd, lead });
    }
    current = "";
    y = undefined;
    height = undefined;
    prevEnd = undefined;
    charWidth = undefined;
    inkWidth = 0;
    inkChars = 0;
  };

  for (const item of items) {
    const itemY = item.transform?.[5];
    const itemX = item.transform?.[4];
    const itemH = item.height || Math.abs(item.transform?.[3] ?? 0) || undefined;

    // A change of baseline without an explicit end-of-line is still a new line.
    if (current !== "" && y !== undefined && itemY !== undefined) {
      const tolerance = (height ?? itemH ?? 10) * 0.5;
      if (Math.abs(itemY - y) > tolerance) flush();
    }

    if (item.str !== "") {
      // Items that sit apart on the same line without a space between them.
      if (
        current !== "" &&
        prevEnd !== undefined &&
        itemX !== undefined &&
        itemX - prevEnd > (itemH ?? 10) * 0.15 &&
        !/\s$/.test(current) &&
        !/^\s/.test(item.str)
      ) {
        current += " ";
      }
      current += item.str;
      if (y === undefined) y = itemY;
      if (height === undefined || (itemH !== undefined && itemH > height)) height = itemH;
      if (itemX !== undefined && item.width !== undefined) {
        prevEnd = itemX + item.width;
        if (item.str.trim() !== "") {
          inkWidth += item.width;
          inkChars += item.str.length;
          charWidth = inkWidth / inkChars;
        }
      }
    }

    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

/** Joins one page's lines into paragraphs separated by blank lines. */
export function linesToText(lines: Line[]): string {
  const out: string[] = [];
  const measure = Math.max(0, ...lines.map((l) => l.end ?? 0));
  const continues = (prev: Line, next: Line) => continuesInto(prev, next, measure);
  let paragraph = "";
  let prev: Line | undefined;

  for (const line of lines) {
    if (prev === undefined) {
      paragraph = line.text;
    } else if (continues(prev, line)) {
      paragraph += prev.text.endsWith("-") ? line.text : ` ${line.text}`;
    } else {
      out.push(paragraph);
      if (gapBetween(prev, line) === "paragraph") out.push("");
      paragraph = line.text;
    }
    prev = line;
  }
  if (prev !== undefined) out.push(paragraph);
  return out.join("\n");
}

/** Builds the document text from each page's items, in page order. */
export function joinPages(pages: PdfTextItem[][]): string {
  const texts = pages.map((items) => linesToText(pageItemsToLines(items))).filter((t) => t !== "");
  let out = "";
  for (const text of texts) {
    if (out === "") {
      out = text;
      continue;
    }
    // A paragraph cut by a page break carries on: the page ended mid-sentence
    // and the next page doesn't open a new clause.
    const lastLine = out.slice(out.lastIndexOf("\n") + 1);
    const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
    const carriesOn = !SENTENCE_END.test(lastLine) && !BLOCK_START.test(firstLine);
    out += carriesOn ? (lastLine.endsWith("-") ? "" : " ") + text : `\n\n${text}`;
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Whether extracted text is enough to analyse. A scanned or photographed
 * PDF has no text layer, or only stray characters such as page numbers.
 * Redline does no OCR (ADR 0001), so such a PDF is refused.
 */
export function hasTextLayer(text: string, pageCount: number): boolean {
  const chars = text.replace(/\s/g, "").length;
  return chars >= 100 && chars >= 25 * Math.max(1, pageCount);
}

/**
 * Whether `next` carries on the paragraph `prev` started. A line only wraps
 * because its next word didn't fit, so if the next line's first word would
 * have fitted on this one, the break was deliberate (signature blocks,
 * addresses, short headings).
 */
function continuesInto(prev: Line, next: Line, measure: number): boolean {
  if (gapBetween(prev, next) === "paragraph") return false;
  if (SENTENCE_END.test(prev.text)) return false;
  if (BLOCK_START.test(next.text)) return false;
  if (prev.end !== undefined && next.lead !== undefined && measure > 0) {
    if (prev.end + next.lead < measure) return false;
  }
  return true;
}

function gapBetween(prev: Line, next: Line): "line" | "paragraph" | "unknown" {
  if (prev.y === undefined || next.y === undefined) return "unknown";
  const h = prev.height ?? next.height;
  if (!h) return "unknown";
  return Math.abs(prev.y - next.y) >= h * PARAGRAPH_GAP ? "paragraph" : "line";
}

/** Collapses runs of spaces and tabs (and no-break spaces) within one line. */
function collapse(text: string): string {
  return text.replace(/[ \t ]+/g, " ").trim();
}
