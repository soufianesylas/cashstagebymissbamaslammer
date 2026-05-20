#!/usr/bin/env node
/**
 * Uploads a built .aab to Google Play and creates/updates a track release.
 *
 * Usage:
 *   node scripts/upload-play.mjs \
 *     [--aab path/to/app-release.aab] \
 *     [--track internal|alpha|beta|production] \
 *     [--status draft|inProgress|halted|completed] \
 *     [--notes "release notes"] \
 *     [--package com.missbamaslammer.cashstage]
 *
 * Required env:
 *   GOOGLE_PLAY_SERVICE_ACCOUNT   JSON of the Play service account key
 *
 * Uses the Play Developer API v3 Edits flow:
 *   insert edit → upload bundle → update track → commit
 *
 * Zero external deps — pure Node fetch + googleapis-style JWT signing.
 */
import { readFileSync, statSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const AAB = resolve(args.aab || "android/app/build/outputs/bundle/release/app-release.aab");
const TRACK = args.track || "internal";
const STATUS = args.status || "draft";
const NOTES = args.notes || `Automated upload ${new Date().toISOString()}`;
const PKG = args.package || "com.missbamaslammer.cashstage";

if (!existsSync(AAB)) { console.error(`✖ AAB not found: ${AAB}`); process.exit(1); }
const saJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
if (!saJson) { console.error("✖ GOOGLE_PLAY_SERVICE_ACCOUNT env not set"); process.exit(1); }

let sa;
try { sa = JSON.parse(saJson); } catch { console.error("✖ GOOGLE_PLAY_SERVICE_ACCOUNT is not valid JSON"); process.exit(1); }

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(sa.private_key));
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function api(token, path, opts = {}) {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

(async () => {
  console.log(`▶ Uploading ${AAB} → ${PKG} track=${TRACK} status=${STATUS}`);
  const token = await getAccessToken();

  console.log("▶ Creating edit");
  const edit = await api(token, "/edits", { method: "POST" });
  const editId = edit.id;

  console.log(`▶ Uploading bundle (${(statSync(AAB).size / 1024 / 1024).toFixed(2)} MB)`);
  const bundle = await fetch(
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}/edits/${editId}/bundles?uploadType=media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: readFileSync(AAB),
    }
  );
  const bundleData = await bundle.json();
  if (!bundle.ok) throw new Error(`bundle upload: ${JSON.stringify(bundleData)}`);
  console.log(`✓ uploaded versionCode=${bundleData.versionCode}`);

  console.log(`▶ Assigning to track ${TRACK}`);
  await api(token, `/edits/${editId}/tracks/${TRACK}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      track: TRACK,
      releases: [{
        status: STATUS,
        versionCodes: [String(bundleData.versionCode)],
        releaseNotes: [{ language: "en-US", text: NOTES }],
      }],
    }),
  });

  console.log("▶ Committing edit");
  await api(token, `/edits/${editId}:commit`, { method: "POST" });
  console.log(`✅ Released versionCode=${bundleData.versionCode} to ${TRACK} (${STATUS})`);
})().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
