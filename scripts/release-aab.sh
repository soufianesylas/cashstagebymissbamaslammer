#!/usr/bin/env bash
# One-command Play Store release build.
#
#   ./scripts/release-aab.sh           → uses BUILD_NUMBER=$(date +%s)
#   BUILD_NUMBER=123 ./scripts/release-aab.sh
#
# Requirements on the machine running this:
#   - Node 20+, npm
#   - Java 17 (JAVA_HOME set)
#   - Android SDK (ANDROID_HOME / ANDROID_SDK_ROOT set)
#   - Signing env vars (or .env.release file in repo root):
#       ANDROID_KEYSTORE_BASE64
#       ANDROID_KEYSTORE_PASSWORD
#       ANDROID_KEY_ALIAS
#       ANDROID_KEY_PASSWORD
#     Optional:
#       GOOGLE_SERVICES_JSON_BASE64
#
# Output:
#   dist-release/cashstage-<versionName>-<versionCode>.aab
#   (and the original android/app/build/outputs/bundle/release/app-release.aab)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Load .env.release if present (never commit this file)
if [ -f .env.release ]; then
  echo "▶ Loading .env.release"
  set -a; . ./.env.release; set +a
fi

export CAP_ENV=prod
export BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"

REQUIRED=(ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD)
MISSING=()
for v in "${REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then MISSING+=("$v"); fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "✖ Missing required signing env vars: ${MISSING[*]}" >&2
  echo "  See docs/RELEASE_SIGNING.md to generate the keystore and set them." >&2
  exit 1
fi

echo "▶ Installing deps"
npm ci

echo "▶ Building web assets"
npm run build

if [ ! -d android ]; then
  echo "▶ Adding Android platform"
  npx cap add android
fi

echo "▶ Capacitor sync"
npx cap sync android

echo "▶ Bumping versionCode/versionName (BUILD_NUMBER=$BUILD_NUMBER)"
npm run android:bump

echo "▶ Configuring release signing + Firebase"
npm run android:configure

echo "▶ Gradle bundleRelease"
( cd android && ./gradlew bundleRelease --no-daemon --stacktrace )

SRC="android/app/build/outputs/bundle/release/app-release.aab"
if [ ! -f "$SRC" ]; then
  echo "✖ Expected $SRC not found" >&2; exit 1
fi

VERSION_INFO="$(node scripts/read-version.mjs)"
VERSION_NAME="$(echo "$VERSION_INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).versionName))')"
VERSION_CODE="$(echo "$VERSION_INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).versionCode))')"

mkdir -p dist-release
OUT="dist-release/cashstage-${VERSION_NAME}-${VERSION_CODE}.aab"
cp "$SRC" "$OUT"

echo ""
echo "✅ Play-ready bundle:"
echo "   $OUT"
echo ""
echo "Upload this .aab to Play Console → Production / Internal testing."
