#!/usr/bin/env bash
# One-command Play Store release build.
#
#   ./scripts/release-aab.sh                   → uses BUILD_NUMBER=$(date +%s)
#   BUILD_NUMBER=123 ./scripts/release-aab.sh
#   ./scripts/release-aab.sh --dry-run         → print steps + paths, no build
#   ./scripts/release-aab.sh --upload          → also upload to Play (internal)
#   ./scripts/release-aab.sh --upload --track beta --status draft
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
#       GOOGLE_PLAY_SERVICE_ACCOUNT   (for --upload)
#
# Output:
#   dist-release/cashstage-<versionName>-<versionCode>.aab

set -euo pipefail

DRY=0
UPLOAD=0
TRACK="internal"
STATUS="draft"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run|-n) DRY=1; shift ;;
    --upload)     UPLOAD=1; shift ;;
    --track)      TRACK="$2"; shift 2 ;;
    --status)     STATUS="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env.release ]; then
  echo "▶ Loading .env.release"
  set -a; . ./.env.release; set +a
fi

export CAP_ENV=prod
export BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"

run() {
  echo "▶ $*"
  [ "$DRY" -eq 1 ] || eval "$@"
}

REQUIRED=(ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD)
if [ "$DRY" -eq 0 ]; then
  MISSING=()
  for v in "${REQUIRED[@]}"; do
    [ -z "${!v:-}" ] && MISSING+=("$v")
  done
  if [ ${#MISSING[@]} -gt 0 ]; then
    echo "✖ Missing required signing env vars: ${MISSING[*]}" >&2
    echo "  See docs/RELEASE_SIGNING.md to generate the keystore and set them." >&2
    exit 1
  fi
fi

SRC="android/app/build/outputs/bundle/release/app-release.aab"
OUT_DIR="dist-release"

if [ "$DRY" -eq 1 ]; then
  echo ""
  echo "── DRY RUN — no changes will be made ──"
  echo "  BUILD_NUMBER         = $BUILD_NUMBER"
  echo "  CAP_ENV              = $CAP_ENV"
  echo "  Source AAB           = $SRC"
  echo "  Output dir           = $OUT_DIR"
  echo "  Verify script        = scripts/verify-aab.mjs"
  echo "  Upload to Play       = $([ $UPLOAD -eq 1 ] && echo yes || echo no)"
  [ $UPLOAD -eq 1 ] && echo "  Track / Status       = $TRACK / $STATUS"
  echo "──────────────────────────────────────"
fi

run "npm ci"
run "npm run build"
[ -d android ] || run "npx cap add android"
run "npx cap sync android"
run "npm run android:bump"
run "npm run android:configure"
run "cd android && ./gradlew bundleRelease --no-daemon --stacktrace"

if [ "$DRY" -eq 1 ]; then
  VN_DRY="$(node -e 'console.log(require("./package.json").version)')"
  echo ""
  echo "Would produce: $OUT_DIR/cashstage-${VN_DRY}-${BUILD_NUMBER}.aab"
  [ $UPLOAD -eq 1 ] && echo "Would upload to Play track=$TRACK status=$STATUS"
  exit 0
fi

[ -f "$SRC" ] || { echo "✖ Expected $SRC not found" >&2; exit 1; }

VERSION_INFO="$(node scripts/read-version.mjs)"
VERSION_NAME="$(echo "$VERSION_INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).versionName))')"
VERSION_CODE="$(echo "$VERSION_INFO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).versionCode))')"

mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/cashstage-${VERSION_NAME}-${VERSION_CODE}.aab"
cp "$SRC" "$OUT"

echo "▶ Verifying AAB"
node scripts/verify-aab.mjs "$OUT"

echo ""
echo "✅ Play-ready bundle:"
echo "   $OUT"

if [ "$UPLOAD" -eq 1 ]; then
  echo ""
  echo "▶ Uploading to Google Play (track=$TRACK status=$STATUS)"
  node scripts/upload-play.mjs --aab "$OUT" --track "$TRACK" --status "$STATUS"
fi
