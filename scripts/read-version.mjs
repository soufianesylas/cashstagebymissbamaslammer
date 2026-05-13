#!/usr/bin/env node
// Prints the package.json version + computed Android versionCode (when
// BUILD_NUMBER env is set). Useful for CI logs and debugging.
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const semver = String(pkg.version || "0.0.0");
const m = semver.match(/^(\d+)\.(\d+)\.(\d+)/);
const [_, MAJ, MIN, PAT] = (m || ["0", "0", "0", "0"]).map((x, i) => i === 0 ? x : Number(x));
const build = Number(process.env.BUILD_NUMBER || 0);
const versionCode = process.env.BUILD_NUMBER && !process.env.ENCODE_VERSION_CODE
  ? build
  : MAJ * 1_000_000 + MIN * 10_000 + PAT * 100 + build;
console.log(JSON.stringify({ versionName: semver, versionCode, buildNumber: build }, null, 2));
