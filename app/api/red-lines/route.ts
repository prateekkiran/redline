import { addRedLine, listRedLines } from "@/lib/library/red-lines";
import { fail, readText, refused, signedIn } from "./_shared";

/** GET -> { redLines: RedLine[] }: the signed-in user's red lines, oldest first. */
export async function GET(): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  try {
    return Response.json({ redLines: await listRedLines(auth.supabase) });
  } catch (err) {
    console.error("[red-lines] list failed", err instanceof Error ? err.message : typeof err);
    return fail(500, "Your red lines couldn't be loaded just now. Try again in a minute.");
  }
}

/** POST { text } -> 201 { redLine }: adds a red line to the signed-in user's list. */
export async function POST(request: Request): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  const body = await readText(request);
  if ("response" in body) return body.response;
  try {
    const redLine = await addRedLine(auth.supabase, body.text);
    return Response.json({ redLine }, { status: 201 });
  } catch (err) {
    return refused(err, "add");
  }
}
