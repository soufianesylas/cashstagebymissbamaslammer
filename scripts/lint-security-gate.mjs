#!/usr/bin/env node
/**
 * Supabase security-linter CI gate.
 *
 * Fails the workflow when the Supabase database linter reports any finding
 * whose categories include "SECURITY" with level WARN or ERROR.
 *
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN   personal access token
 *   SUPABASE_PROJECT_REF    target project ref (production)
 *
 * Without those env vars the gate is a no-op (exit 0) so external
 * contributors / forks can still run CI.
 *
 * Accepted SECURITY DEFINER RPCs are listed in ACCEPTED_DEFINER_FNS and the
 * matching warnings are ignored. Keep that list in sync with the database
 * migration that grants EXECUTE to authenticated.
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.log(
    "ℹ SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF not set — skipping linter gate."
  );
  process.exit(0);
}

// Intentional, reviewed exceptions. See docs/SECURITY.md and the
// `Lock down database function permissions` migration.
const ACCEPTED_DEFINER_FNS = new Set([
  "submit_track_score",
  "increment_play_count",
  "is_panel_judge",
  "anonymous_track_score_tallies",
  "boosted_track_order",
  "open_todays_contest",
  "close_expired_contests",
]);

const url = `https://api.supabase.com/v1/projects/${REF}/database/lints`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
if (!res.ok) {
  console.error(`✖ Supabase linter API call failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(2);
}

const findings = await res.json();
if (!Array.isArray(findings)) {
  console.error("✖ Unexpected linter response shape:", findings);
  process.exit(2);
}

const blocking = [];
for (const f of findings) {
  const cats = f.categories ?? f.metadata?.categories ?? [];
  const level = String(f.level ?? "").toUpperCase();
  const isSecurity = Array.isArray(cats) && cats.some((c) => String(c).toUpperCase() === "SECURITY");
  if (!isSecurity) continue;
  if (level !== "WARN" && level !== "ERROR") continue;

  // Skip accepted SECURITY DEFINER RPCs.
  const detail = JSON.stringify(f.metadata ?? f.detail ?? f);
  const fnName = (detail.match(/"function_name"\s*:\s*"([^"]+)"/) || [])[1];
  if (fnName && ACCEPTED_DEFINER_FNS.has(fnName)) continue;

  blocking.push(f);
}

if (blocking.length === 0) {
  console.log("✅ Supabase security lint: clean (no blocking SECURITY findings).");
  process.exit(0);
}

console.error(`\n✖ ${blocking.length} blocking SECURITY finding(s):\n`);
for (const f of blocking) {
  console.error(`  [${f.level}] ${f.name ?? f.title ?? f.detail ?? "(no name)"}`);
  if (f.description) console.error(`         ${f.description}`);
  if (f.remediation) console.error(`         → ${f.remediation}`);
  console.error("");
}
console.error("See docs/SECURITY.md for the accepted-exceptions policy.\n");
process.exit(1);
