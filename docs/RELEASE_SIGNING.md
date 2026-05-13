# Android Release Signing & Play Store CI

This project ships to Google Play through the **`Android Release (Play Store)`**
GitHub Actions workflow. The workflow is fully automated — push a `vX.Y.Z` tag
or trigger it manually from the Actions tab.

## One-time setup

### 1. Generate an upload keystore (do this ONCE, on your laptop)

```bash
keytool -genkeypair -v \
  -keystore upload-keystore.jks \
  -alias cashstage-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Pick a strong store password and key password. **Back up `upload-keystore.jks`
in a password manager** — losing it permanently locks you out of the Play Store
listing (Play does NOT let you replace an upload key without manual support).

Convert it to base64 for the GitHub secret:

```bash
base64 -w0 upload-keystore.jks > upload-keystore.b64
```

### 2. Add GitHub secrets

In `Settings → Secrets and variables → Actions` of your GitHub repo, add:

| Secret                          | Value                                            |
| ------------------------------- | ------------------------------------------------ |
| `ANDROID_KEYSTORE_BASE64`       | Contents of `upload-keystore.b64`                |
| `ANDROID_KEYSTORE_PASSWORD`     | Store password                                   |
| `ANDROID_KEY_ALIAS`             | `cashstage-upload` (or whatever alias you chose) |
| `ANDROID_KEY_PASSWORD`          | Key password                                     |
| `GOOGLE_PLAY_SERVICE_ACCOUNT`   | Full JSON of Play service-account key (see below) |
| `GOOGLE_SERVICES_JSON_BASE64`   | base64 of Firebase `google-services.json`        |

### 3. Play Console service account

1. Play Console → **Setup → API access** → link a Google Cloud project
2. Create a service account with role **Service Account User**
3. Grant it these Play permissions: *Release apps to testing tracks*, *Release
   to production*, *Manage store presence*
4. Generate a JSON key, paste the entire JSON into `GOOGLE_PLAY_SERVICE_ACCOUNT`

### 4. Firebase (optional but recommended)

1. Firebase Console → Add Android app → package `com.missbamaslammer.cashstage`
2. Download `google-services.json`
3. `base64 -w0 google-services.json` → paste into `GOOGLE_SERVICES_JSON_BASE64`

The `scripts/configure-android-release.mjs` script will drop the file into
`android/app/google-services.json` and apply the Gradle plugin during CI.

## Versioning

- `versionName` ← `package.json` `"version"` (e.g. `1.0.0`)
- `versionCode` ← `BUILD_NUMBER` env (CI uses `github.run_number` — strictly
  monotonic across all runs, ever, so Play will never reject a duplicate)

Bump `package.json` version and tag:

```bash
npm version patch    # or minor / major
git push --follow-tags
```

The tag push triggers `android-release.yml` automatically.

## Manual run

Actions tab → **Android Release (Play Store)** → **Run workflow** →
choose track (`internal` / `alpha` / `beta` / `production`) and status
(`draft` recommended for first manual upload).

## Local release build

```bash
export BUILD_NUMBER=$(date +%s)            # any monotonic int
export ANDROID_KEYSTORE_BASE64=$(base64 -w0 ~/upload-keystore.jks)
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=cashstage-upload
export ANDROID_KEY_PASSWORD=...

npm ci
npm run build
npx cap sync android
npm run android:bump
npm run android:configure
cd android && ./gradlew bundleRelease
# AAB → android/app/build/outputs/bundle/release/app-release.aab
```

## iOS

```bash
npx cap add ios
npm run cap:sync:ios
npm run cap:open:ios   # opens Xcode for archive + App Store upload
```

iOS CI (signing, TestFlight upload) is not configured yet — Apple's signing
flow needs an Apple Developer account; add a Fastlane lane when ready.
