#!/usr/bin/env bash
# One-command App Store Connect release build (iOS).
#
#   ./scripts/release-ipa.sh           → uses BUILD_NUMBER=$(date +%s)
#   BUILD_NUMBER=123 ./scripts/release-ipa.sh
#   ./scripts/release-ipa.sh --dry-run
#
# Requires (on macOS, with Xcode 15+):
#   - Node 20+, CocoaPods, Xcode command-line tools
#   - APPLE_TEAM_ID                        Apple Developer team id (10 chars)
#   - IOS_BUNDLE_ID                        e.g. com.missbamaslammer.cashstage
#   - IOS_CODE_SIGN_IDENTITY               e.g. "Apple Distribution: Your Name (TEAMID)"
#   - IOS_PROVISIONING_PROFILE_UUID        UUID of installed App Store profile
# Optional (auto-upload to App Store Connect):
#   - APP_STORE_CONNECT_API_KEY_ID         Key ID
#   - APP_STORE_CONNECT_API_ISSUER_ID      Issuer UUID
#   - APP_STORE_CONNECT_API_KEY_BASE64     base64 of the .p8 private key
#
# Output:
#   dist-release/cashstage-<versionName>-<buildNumber>.ipa
#   dist-release/cashstage-<versionName>-<buildNumber>.xcarchive (kept)

set -euo pipefail

DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run|-n) DRY=1 ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[ -f .env.release ] && { set -a; . ./.env.release; set +a; }

export CAP_ENV=prod
export BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"

run() {
  echo "▶ $*"
  [ "$DRY" -eq 1 ] || eval "$@"
}

if [ "$(uname -s)" != "Darwin" ] && [ "$DRY" -eq 0 ]; then
  echo "✖ iOS builds require macOS + Xcode" >&2
  exit 1
fi

REQ=(APPLE_TEAM_ID IOS_BUNDLE_ID IOS_CODE_SIGN_IDENTITY IOS_PROVISIONING_PROFILE_UUID)
if [ "$DRY" -eq 0 ]; then
  MISS=()
  for v in "${REQ[@]}"; do [ -z "${!v:-}" ] && MISS+=("$v"); done
  if [ ${#MISS[@]} -gt 0 ]; then
    echo "✖ Missing required env: ${MISS[*]}" >&2
    echo "  See docs/RELEASE_SIGNING.md for the iOS setup." >&2
    exit 1
  fi
fi

VERSION_NAME="$(node -e 'console.log(require("./package.json").version)')"
echo "▶ versionName=$VERSION_NAME buildNumber=$BUILD_NUMBER"

run "npm ci"
run "npm run build"
[ -d ios ] || run "npx cap add ios"
run "npx cap sync ios"

# Bump iOS MARKETING_VERSION + CURRENT_PROJECT_VERSION via PlistBuddy/agvtool
if [ "$DRY" -eq 0 ]; then
  PBXPROJ="ios/App/App.xcodeproj/project.pbxproj"
  if [ -f "$PBXPROJ" ]; then
    sed -i.bak -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${VERSION_NAME};/g" "$PBXPROJ"
    sed -i.bak -E "s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};/g" "$PBXPROJ"
    rm -f "$PBXPROJ.bak"
    echo "✓ Bumped MARKETING_VERSION=$VERSION_NAME CURRENT_PROJECT_VERSION=$BUILD_NUMBER"
  fi
fi

mkdir -p dist-release
ARCHIVE="dist-release/cashstage-${VERSION_NAME}-${BUILD_NUMBER}.xcarchive"
IPA_DIR="dist-release/ipa-${BUILD_NUMBER}"
IPA_OUT="dist-release/cashstage-${VERSION_NAME}-${BUILD_NUMBER}.ipa"

run "cd ios/App && pod install --silent"

run "xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath '$ARCHIVE' archive \
  DEVELOPMENT_TEAM='${APPLE_TEAM_ID:-TEAMID}' \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY='${IOS_CODE_SIGN_IDENTITY:-}' \
  PROVISIONING_PROFILE_SPECIFIER='${IOS_PROVISIONING_PROFILE_UUID:-}'"

# Export options plist
EXPORT_PLIST="dist-release/ExportOptions-${BUILD_NUMBER}.plist"
if [ "$DRY" -eq 0 ]; then
  cat > "$EXPORT_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store</string>
  <key>teamID</key><string>${APPLE_TEAM_ID}</string>
  <key>signingStyle</key><string>manual</string>
  <key>provisioningProfiles</key><dict>
    <key>${IOS_BUNDLE_ID}</key><string>${IOS_PROVISIONING_PROFILE_UUID}</string>
  </dict>
  <key>uploadSymbols</key><true/>
  <key>uploadBitcode</key><false/>
</dict></plist>
PLIST
fi

run "xcodebuild -exportArchive -archivePath '$ARCHIVE' \
  -exportPath '$IPA_DIR' -exportOptionsPlist '$EXPORT_PLIST'"

if [ "$DRY" -eq 0 ]; then
  FOUND="$(find "$IPA_DIR" -name '*.ipa' | head -1)"
  [ -z "$FOUND" ] && { echo "✖ No .ipa produced"; exit 1; }
  cp "$FOUND" "$IPA_OUT"
  echo "✅ IPA: $IPA_OUT"
  echo "   Archive: $ARCHIVE"
fi

# Optional upload to App Store Connect via altool
if [ "$DRY" -eq 0 ] && [ -n "${APP_STORE_CONNECT_API_KEY_ID:-}" ] && \
   [ -n "${APP_STORE_CONNECT_API_ISSUER_ID:-}" ] && \
   [ -n "${APP_STORE_CONNECT_API_KEY_BASE64:-}" ]; then
  KEY_DIR="$HOME/.appstoreconnect/private_keys"
  mkdir -p "$KEY_DIR"
  KEY_PATH="$KEY_DIR/AuthKey_${APP_STORE_CONNECT_API_KEY_ID}.p8"
  echo "$APP_STORE_CONNECT_API_KEY_BASE64" | base64 -d > "$KEY_PATH"
  echo "▶ Uploading to App Store Connect (TestFlight)"
  xcrun altool --upload-app -f "$IPA_OUT" -t ios \
    --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID"
  echo "✅ Uploaded to App Store Connect"
else
  [ "$DRY" -eq 0 ] && echo "ℹ Skipping ASC upload (set APP_STORE_CONNECT_API_KEY_* to enable)"
fi
