import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./config";

/** Supabase client for Client Components. Session lives in cookies. */
export function createClient() {
  const { url, anonKey } = supabaseEnv();
  return createBrowserClient(url, anonKey);
}
