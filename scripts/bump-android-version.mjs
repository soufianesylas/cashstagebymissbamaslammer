#!/usr/bin/env node
// Updates android/app/build.gradle with versionCode + versionName derived from
// package.json "version" plus a build number. Designed to run before
// `cap sync android` so every Play Store upload is consistent.
//
// versionName  =  <package.json version>            e.g. "1.4.2"
//                 (optionally suffixed with "+<gitsha>" when not a release)
// versionCode  =  BUILD_NUMBER env var (integer, monotonically increasing)
//                 falls back to a deterministic encoding of the semver:
//                   MAJOR * 1_000_000 + MINOR * 10_000 + PATCH * 100 + BUILD
//                 where BUILD = (env BUILD_NUMBER || 0)
//
// Usage:
//   node scripts/bump-android-version.mjs
//   BUILD_NUMBER=42 node scripts/bump-android-version.mjs
//   BUILD_NUMBER=42 INCLUDE_GIT_SHA=1 node scripts/bump-android-version.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = process.cwd();
const PKG_PATH = resolve(ROOT, "package.json");
const GRADLE_PATH = resolve(ROOT, "android/app/build.gradle");

if (!existsSync(GRADLE_PATH)) {
  console.warn(
    `[bump-android-version] ${GRADLE_PATH} not found. Run 'npx cap add android' first. Skipping.`
  );
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));
const semver = String(pkg.version || "0.0.0").trim();
const m = semver.match(/^(\d+)\.(\d+)\.(\d+)/);
if (!m) {
  console.error(`[bump-android-version] package.json version "${semver}" is not semver`);
  process.exit(1);
}
const [, MAJ, MIN, PAT] = m.map((x, i) => (i === 0 ? x : Number(x)));

const buildNumber = Number(process.env.BUILD_NUMBER || 0);
if (Number.isNaN(buildNumber) || buildNumber < 0) {
  console.error(`[bump-android-version] BUILD_NUMBER must be a non-negative integer`);
  process.exit(1);
}

// Encoded versionCode keeps it monotonic across releases even if BUILD_NUMBER
// resets between machines. Cap each segment so we stay under Play's 2.1B limit.
//   MAJ < 2100, MIN < 100, PAT < 100, BUILD < 100   (more than enough headroom)
if (MAJ >= 2100 || MIN >= 100 || PAT >= 100 || buildNumber >= 100) {
  console.error(
    `[bump-android-version] version segments out of range (max 2099.99.99 + build<100)`
  );
  process.exit(1);
}
const versionCode =
  process.env.BUILD_NUMBER && !process.env.ENCODE_VERSION_CODE
    ? buildNumber
    : MAJ * 1_000_000 + MIN * 10_000 + PAT * 100 + buildNumber;

let gitSha = "";
if (process.env.INCLUDE_GIT_SHA === "1") {
  try {
    gitSha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    gitSha = "";
  }
}
const versionName = gitSha ? `${semver}+${gitSha}` : semver;

let gradle = readFileSync(GRADLE_PATH, "utf8");
const before = gradle;

gradle = gradle.replace(/(versionCode\s+)\d+/, `$1${versionCode}`);
gradle = gradle.replace(/(versionName\s+)"[^"]*"/, `$1"${versionName}"`);

if (gradle === before) {
  console.warn(
    "[bump-android-version] Could not find versionCode/versionName lines in build.gradle. No changes."
  );
  process.exit(0);
}

writeFileSync(GRADLE_PATH, gradle);
console.log(
  `[bump-android-version] android/app/build.gradle → versionCode=${versionCode}, versionName="${versionName}"`
);
