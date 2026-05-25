#!/usr/bin/env node
/**
 * Production safety guard.
 *
 * Fails the build if mock in-app purchases would ship to production.
 *
 *  1. Refuses if `ALLOW_MOCK_PURCHASES=true` is in the build environment.
 *     This env var is read at runtime by `supabase/functions/verify-purchase`
 *     and must NEVER be set in a production deployment.
 *
 *  2. Verifies the verify-purchase edge function still contains the
 *     server-side "mock_disabled" refusal block, so the gate cannot be
 *     silently removed by an accidental edit.
 *
 * Invoked from:
 *   - scripts/release-aab.sh                 (local + CI Play Store builds)
 *   - .github/workflows/android-release.yml  (release pipeline)
 *
 * Exit codes:
 *   0  safe to build
 *   1  unsafe — build must abort
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const errors = [];

if (process.env.ALLOW_MOCK_PURCHASES === "true") {
  errors.push(
    "ALLOW_MOCK_PURCHASES=true is set in the build environment.\n" +
      "    Mock purchases must NEVER be enabled in production.\n" +
      "    Unset this variable (and remove it from any deployment secret store)\n" +
      "    before producing a Play Store / App Store build."
  );
}

const fnPath = resolve("supabase/functions/verify-purchase/index.ts");
if (!existsSync(fnPath)) {
  errors.push(`Cannot find ${fnPath} — refusing to release without the IAP verifier.`);
} else {
  const src = readFileSync(fnPath, "utf8");
  const hasGate =
    src.includes("ALLOW_MOCK_PURCHASES") && src.includes('"mock_disabled"');
  if (!hasGate) {
    errors.push(
      "supabase/functions/verify-purchase/index.ts no longer contains the\n" +
        "    ALLOW_MOCK_PURCHASES gate (expected the literal \"mock_disabled\"\n" +
        "    refusal branch). Restore it before releasing."
    );
  }
}

if (errors.length > 0) {
  console.error("\n✖ Production config check failed:\n");
  for (const e of errors) console.error("  - " + e + "\n");
  console.error("See docs/SECURITY.md for details.\n");
  process.exit(1);
}

console.log("✅ Production config check passed (mock purchases disabled).");
