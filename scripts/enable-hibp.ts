/**
 * Turns on leaked-password protection for the linked Supabase project.
 *
 * Supabase checks new passwords against HaveIBeenPwned. The setting isn't in
 * config.toml, so `supabase config push` can't set it; it has to go through
 * the Management API. The credential comes from the Supabase CLI's own
 * keychain entry, so nothing secret is written to this repo.
 *
 *   pnpm exec tsx scripts/enable-hibp.ts <project-ref>
 */
import { execFileSync } from "node:child_process";

const projectRef = process.argv[2];
if (!projectRef) {
  console.error("Usage: pnpm exec tsx scripts/enable-hibp.ts <project-ref>");
  process.exit(2);
}

function cliToken(): string {
  const raw = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
    encoding: "utf8",
  }).trim();
  return raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.split(".").length === 3).pop() ?? "";
}

async function main() {
  const token = cliToken();
  if (!token) {
    console.error("No Supabase CLI token found in the keychain.");
    process.exit(1);
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password_hibp_enabled: true }),
  });
  console.log("status:", res.status);
  if (!res.ok) {
    console.log("body:", (await res.text()).slice(0, 300));
    process.exit(1);
  }
  const config = (await res.json()) as Record<string, unknown>;
  console.log("password_hibp_enabled =", config.password_hibp_enabled);
  console.log("password_min_length =", config.password_min_length);
}

main();
