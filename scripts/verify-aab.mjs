#!/usr/bin/env node
/**
 * Verifies a built Play Store AAB:
 *   1. File exists and is non-empty
 *   2. Extracts versionCode + versionName from BundleConfig / AndroidManifest
 *   3. Compares against .release-history.json (local monotonic ledger)
 *   4. Fails with non-zero exit if Play would reject the upload
 *
 * Usage:
 *   node scripts/verify-aab.mjs [path/to/app-release.aab]
 *
 * Optional env:
 *   SKIP_HISTORY=1            don't read/write .release-history.json
 *   EXPECTED_PACKAGE=com.x    fail if AAB package id mismatches
 */
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const AAB = resolve(
  process.argv[2] || "android/app/build/outputs/bundle/release/app-release.aab"
);
const HISTORY = resolve(".release-history.json");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`✓ ${msg}`);
}

// 1. exists + size
if (!existsSync(AAB)) fail(`AAB not found at ${AAB}`);
const size = statSync(AAB).size;
if (size < 50_000) fail(`AAB suspiciously small (${size} bytes)`);
ok(`AAB present: ${AAB} (${(size / 1024 / 1024).toFixed(2)} MB)`);

// 2. extract version info
let versionCode = null;
let versionName = null;
let pkgId = null;

function tryAapt2() {
  try {
    const out = execSync(`aapt2 dump badging "${AAB}" 2>/dev/null`, {
      encoding: "utf8",
    });
    const vc = out.match(/versionCode='(\d+)'/);
    const vn = out.match(/versionName='([^']+)'/);
    const pk = out.match(/package: name='([^']+)'/);
    if (vc) versionCode = Number(vc[1]);
    if (vn) versionName = vn[1];
    if (pk) pkgId = pk[1];
    return !!(vc && vn);
  } catch {
    return false;
  }
}

function fallbackUnzip() {
  const gradle = "android/app/build.gradle";
  if (!existsSync(gradle)) return false;
  const g = readFileSync(gradle, "utf8");
  const vc = g.match(/versionCode\s+(\d+)/);
  const vn = g.match(/versionName\s+"([^"]+)"/);
  const pk = g.match(/applicationId\s+"([^"]+)"/);
  if (vc) versionCode = Number(vc[1]);
  if (vn) versionName = vn[1];
  if (pk) pkgId = pk[1];
  return !!(vc && vn);
}

if (!tryAapt2() && !fallbackUnzip()) {
  fail("could not determine versionCode/versionName from AAB or build.gradle");
}
ok(`package=${pkgId || "?"} versionName=${versionName} versionCode=${versionCode}`);

if (process.env.EXPECTED_PACKAGE && pkgId && pkgId !== process.env.EXPECTED_PACKAGE) {
  fail(`package id ${pkgId} != EXPECTED_PACKAGE=${process.env.EXPECTED_PACKAGE}`);
}

// 3. Play limits + monotonic check
if (!Number.isInteger(versionCode) || versionCode <= 0) {
  fail(`versionCode must be a positive integer (got ${versionCode})`);
}
if (versionCode >= 2_100_000_000) {
  fail(`versionCode ${versionCode} exceeds Play limit (2,100,000,000)`);
}

if (process.env.SKIP_HISTORY !== "1") {
  let history = { lastVersionCode: 0, entries: [] };
  if (existsSync(HISTORY)) {
    try { history = JSON.parse(readFileSync(HISTORY, "utf8")); } catch { }
  }
  if (versionCode <= (history.lastVersionCode || 0)) {
    fail(
      `versionCode ${versionCode} is NOT greater than last released ` +
      `${history.lastVersionCode}. Play will reject. Bump BUILD_NUMBER or package.json version.`
    );
  }
  history.lastVersionCode = versionCode;
  history.entries = (history.entries || []).slice(-49);
  history.entries.push({
    versionCode, versionName, at: new Date().toISOString(),
  });
  writeFileSync(HISTORY, JSON.stringify(history, null, 2));
  ok(`history updated: ${HISTORY}`);
}

ok("AAB verification passed — safe to upload to Play Console.");
