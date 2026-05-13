#!/usr/bin/env node
/**
 * Configures the Android project for a Play Store release build:
 *
 *  1. Decodes ANDROID_KEYSTORE_BASE64 → android/app/upload-keystore.jks
 *  2. Writes a signingConfigs + release block into android/app/build.gradle
 *     (idempotent — wrapped in `// >>> LOVABLE_RELEASE_SIGNING` markers).
 *  3. Decodes GOOGLE_SERVICES_JSON_BASE64 → android/app/google-services.json
 *     and ensures the google-services Gradle plugin is applied.
 *
 * Required env (only when producing a signed release in CI):
 *   ANDROID_KEYSTORE_BASE64     base64 of upload keystore (.jks)
 *   ANDROID_KEYSTORE_PASSWORD   store password
 *   ANDROID_KEY_ALIAS           key alias
 *   ANDROID_KEY_PASSWORD        key password
 *
 * Optional:
 *   GOOGLE_SERVICES_JSON_BASE64 base64 of Firebase google-services.json
 *
 * Safe to run repeatedly; missing env vars cause that section to be skipped.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ANDROID = resolve(process.cwd(), "android");
const APP = resolve(ANDROID, "app");
const GRADLE = resolve(APP, "build.gradle");
const PROJECT_GRADLE = resolve(ANDROID, "build.gradle");

if (!existsSync(GRADLE)) {
  console.warn(`[configure-android-release] ${GRADLE} not found. Run 'npx cap add android' first. Skipping.`);
  process.exit(0);
}

function writeBase64(envVar, outPath) {
  const b64 = process.env[envVar];
  if (!b64) return false;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`[configure-android-release] wrote ${outPath} from $${envVar}`);
  return true;
}

// 1 + 2. Signing config
const haveKeystore = writeBase64("ANDROID_KEYSTORE_BASE64", resolve(APP, "upload-keystore.jks"));
const storePass = process.env.ANDROID_KEYSTORE_PASSWORD;
const keyAlias = process.env.ANDROID_KEY_ALIAS;
const keyPass = process.env.ANDROID_KEY_PASSWORD;

let gradle = readFileSync(GRADLE, "utf8");
const START = "// >>> LOVABLE_RELEASE_SIGNING";
const END = "// <<< LOVABLE_RELEASE_SIGNING";
// strip any existing block
gradle = gradle.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`, "g"), "");

if (haveKeystore && storePass && keyAlias && keyPass) {
  const block = `${START}
android {
    signingConfigs {
        release {
            storeFile file("upload-keystore.jks")
            storePassword "${storePass.replace(/"/g, '\\"')}"
            keyAlias "${keyAlias.replace(/"/g, '\\"')}"
            keyPassword "${keyPass.replace(/"/g, '\\"')}"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
${END}
`;
  gradle = gradle.trimEnd() + "\n\n" + block;
  console.log("[configure-android-release] release signing config injected");
} else {
  console.warn("[configure-android-release] signing env not fully set — release will be unsigned");
}

// 3. Firebase / google-services
const haveGoogleServices = writeBase64("GOOGLE_SERVICES_JSON_BASE64", resolve(APP, "google-services.json"));
if (haveGoogleServices) {
  if (!gradle.includes("com.google.gms.google-services")) {
    gradle = `apply plugin: 'com.google.gms.google-services'\n` + gradle;
  }
  // Add classpath to project-level build.gradle if missing
  if (existsSync(PROJECT_GRADLE)) {
    let proj = readFileSync(PROJECT_GRADLE, "utf8");
    if (!proj.includes("com.google.gms:google-services")) {
      proj = proj.replace(
        /dependencies\s*\{/,
        `dependencies {\n        classpath 'com.google.gms:google-services:4.4.2'`
      );
      writeFileSync(PROJECT_GRADLE, proj);
      console.log("[configure-android-release] added google-services classpath to project build.gradle");
    }
  }
}

writeFileSync(GRADLE, gradle);
console.log("[configure-android-release] done");
