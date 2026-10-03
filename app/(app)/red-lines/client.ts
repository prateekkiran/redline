/**
 * The browser side of the red-lines API (/api/red-lines). Pure: every call
 * takes the fetch to use, so it can be tested without a server. Nothing here
 * throws; each call says whether it worked and, if not, what to tell the
 * reader.
 */

/**
 * The server's limits (MAX_RED_LINES and MAX_RED_LINE_CHARS in
 * lib/analysis/red-lines). Repeated here so this client module doesn't pull
 * the analysis module into the browser; a test keeps the two equal.
 */
export const MAX_RED_LINES = 20;
export const MAX_RED_LINE_CHARS = 200;

export const RED_LINES_ENDPOINT = "/api/red-lines";

export type ClientRedLine = { id: string; text: string };

export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type ErrorMessages = {
  offline: string;
  notConfigured: string;
  signedOut: string;
  fallback: string;
};

export function redLinesClient(messages: ErrorMessages, doFetch: FetchLike = (i, init) => fetch(i, init)) {
  async function call<T>(
    url: string,
    init: RequestInit,
    read: (body: unknown, res: Response) => T | undefined,
  ): Promise<Outcome<T>> {
    let res: Response;
    try {
      res = await doFetch(url, init);
    } catch {
      return { ok: false, status: 0, message: messages.offline };
    }
    const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);
    if (res.ok) {
      const value = read(body, res);
      if (value !== undefined) return { ok: true, value };
      return { ok: false, status: res.status, message: messages.fallback };
    }
    return { ok: false, status: res.status, message: errorMessage(res.status, body, messages) };
  }

  const json = (method: string, text?: string): RequestInit =>
    text === undefined
      ? { method }
      : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) };

  const itemUrl = (id: string) => `${RED_LINES_ENDPOINT}/${encodeURIComponent(id)}`;

  return {
    list: () =>
      call<ClientRedLine[]>(RED_LINES_ENDPOINT, { method: "GET" }, (body) => {
        const list = field(body, "redLines");
        return Array.isArray(list) && list.every(isRedLine) ? list.map(pick) : undefined;
      }),
    add: (text: string) =>
      call<ClientRedLine>(RED_LINES_ENDPOINT, json("POST", text), (body) => {
        const one = field(body, "redLine");
        return isRedLine(one) ? pick(one) : undefined;
      }),
    edit: (id: string, text: string) =>
      call<ClientRedLine>(itemUrl(id), json("PATCH", text), (body) => {
        const one = field(body, "redLine");
        return isRedLine(one) ? pick(one) : undefined;
      }),
    remove: (id: string) => call<true>(itemUrl(id), json("DELETE"), () => true),
  };
}

/** The server's own words when it sent some, else a plain fallback by status. */
function errorMessage(status: number, body: unknown, messages: ErrorMessages): string {
  const said = field(body, "error");
  if (typeof said === "string" && said !== "") return said;
  if (status === 503) return messages.notConfigured;
  if (status === 401) return messages.signedOut;
  return messages.fallback;
}

function field(body: unknown, key: string): unknown {
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

function isRedLine(v: unknown): v is ClientRedLine {
  return typeof field(v, "id") === "string" && typeof field(v, "text") === "string";
}

function pick(r: ClientRedLine): ClientRedLine {
  return { id: r.id, text: r.text };
}

/** How the add/edit field should describe the length of what's typed. */
export function lengthLeft(text: string): number {
  return MAX_RED_LINE_CHARS - text.replace(/\s+/g, " ").trim().length;
}
