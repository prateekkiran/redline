/**
 * Runs the real analysis on the adhesion fixture: real OpenRouter client,
 * no stub. Prints the summary and every flag, then re-checks that each
 * quoted sentence is an exact substring of the document.
 *
 *   pnpm smoke
 *
 * Reads .env.local when present. Never prints the key.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { analyzeDocument, type FlagDiagnostics } from "../lib/analysis";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local: rely on the environment as it is.
}

async function main() {
  const fixture = path.resolve(process.cwd(), "tests/fixtures/adhesion-contract.txt");
  const text = readFileSync(fixture, "utf8");
  console.log(`Model: ${process.env.OPENROUTER_MODEL || "(OPENROUTER_MODEL not set)"}`);
  console.log(`Document: ${path.relative(process.cwd(), fixture)} (${text.length} characters)\n`);

  let diagnostics: FlagDiagnostics | undefined;
  const result = await analyzeDocument(text, [], { onDiagnostics: (d) => (diagnostics = d) });

  console.log("SUMMARY");
  console.log(result.summary);
  console.log("");

  result.flags.forEach((flag, i) => {
    console.log(`#${i + 1}  ${flag.category}  severity ${flag.severity}`);
    console.log(`  Source:      "${flag.sourceSentence}"`);
    console.log(`  Description: ${flag.description}`);
    console.log(`  Counter:     ${flag.counterOffer || "(none)"}`);
    console.log("");
  });

  const n = result.flags.length;
  const verified = result.flags.filter((f) => text.includes(f.sourceSentence)).length;
  if (diagnostics) {
    const d = diagnostics;
    console.log(
      `Model proposed ${d.proposed} candidate flags; ${d.kept} survived verification ` +
        `(dropped: ${d.notInDocument} not in document, ${d.tooShort} too short, ` +
        `${d.duplicate} duplicate, ${d.malformed} malformed, ${d.withinDeal} inside the deal); ` +
        `${d.hedged} hedged descriptions.`,
    );
  }
  if (verified !== n) {
    console.error(`${n} flags returned; only ${verified} source sentences are exact substrings.`);
    process.exit(1);
  }
  console.log(`${n} flags returned; all ${n} source sentences verified as exact substrings`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  process.exit(1);
});
