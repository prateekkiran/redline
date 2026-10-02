import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseEnv } from "./config";

/**
 * Supabase client for Server Components, Server Functions and Route
 * Handlers. In Next 16 `cookies()` is async. Server Components can't write
 * cookies, so a failed write there is ignored: the proxy refreshes the
 * session before the page renders.
 */
export async function createClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component; the proxy keeps the session fresh.
        }
      },
    },
  });
}

export type Viewer =
  | { configured: false; user: null }
  | { configured: true; user: User | null };

/**
 * Who is looking at this page. `getUser()` asks the Supabase Auth server to
 * confirm the session, so it is safe to gate data on.
 */
export async function getViewer(): Promise<Viewer> {
  if (!isSupabaseConfigured()) return { configured: false, user: null };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { configured: true, user: data.user ?? null };
}
