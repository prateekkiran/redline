import { removeRedLine, updateRedLine } from "@/lib/library/red-lines";
import { fail, readText, refused, signedIn } from "../_shared";

const NOT_FOUND = "That red line isn't in your list.";

/** PATCH { text } -> { redLine }: changes one of the signed-in user's red lines. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  const body = await readText(request);
  if ("response" in body) return body.response;
  const { id } = await ctx.params;
  try {
    const redLine = await updateRedLine(auth.supabase, id, body.text);
    return redLine ? Response.json({ redLine }) : fail(404, NOT_FOUND);
  } catch (err) {
    return refused(err, "edit");
  }
}

/** DELETE -> 204: removes one of the signed-in user's red lines. */
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await signedIn();
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  try {
    return (await removeRedLine(auth.supabase, id))
      ? new Response(null, { status: 204 })
      : fail(404, NOT_FOUND);
  } catch (err) {
    return refused(err, "remove");
  }
}
