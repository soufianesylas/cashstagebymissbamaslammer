# 📦 Cash Stage — Google Play Release Guide

This file walks you through producing a signed `.aab` (Android App Bundle) ready
for Play Store **internal testing**. Run every step on **your own computer** —
the sandbox cannot generate signed builds, and even if it could, the signing
keystore must never live anywhere except your machine + a secure backup.

---

## 0. Prerequisites (one-time install)

| Tool | Version | Why |
|---|---|---|
| Node.js | ≥ 20 LTS | Build tooling |
| Java JDK | 17 | Required by Android Gradle Plugin 8 |
| Android Studio | latest | SDK + emulator + signing UI |
| Android SDK | API 34+ | Play Store target requirement |

---

## 1. Pull the project locally

```bash
git pull
npm install
```

## 2. Choose your final `appId`

Open `capacitor.config.ts`. **Before the first Play Store upload**, replace
`app.lovable.8f53de13...` with your own reverse-domain id (e.g. `com.cashstage.app`).

**This id is permanent** — once your app is on Play, the id can never change.

## 3. Add the Android platform (first time only)

```bash
npx cap add android
```

## 4. Build the production web bundle

```bash
CAP_ENV=prod npm run build
npx cap sync android
```

`CAP_ENV=prod` strips the `server.url` hot-reload pointer so the shipped APK
loads `dist/` from inside the bundle instead of the sandbox URL.

## 5. Generate a signing keystore (one time, **back this up**)

```bash
keytool -genkey -v \
  -keystore cashstage-release.jks \
  -alias cashstage \
  -keyalg RSA -keysize 2048 -validity 10000
```

⚠️ **Critical**: store `cashstage-release.jks` and the passwords in a password
manager. **If you lose this file you can never update your app on Play Store.**

## 6. Wire signing into Gradle

Create `android/keystore.properties` (already gitignored — see step 8):

```properties
storeFile=../../cashstage-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=cashstage
keyPassword=YOUR_KEY_PASSWORD
```

Open `android/app/build.gradle` and add **above** the `android { ... }` block:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Then inside `android { ... }`:

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## 7. Bump the version

In `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.cashstage.app"   // must match capacitor.config.ts appId
    versionCode 1                        // increment EVERY upload
    versionName "1.0.0"                  // user-visible
    minSdkVersion 23
    targetSdkVersion 34
}
```

## 8. Gitignore secrets

Append to `.gitignore` at the repo root:

```
android/keystore.properties
*.jks
*.keystore
```

## 9. Build the `.aab`

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## 10. Upload to Play Console (internal testing track)

1. https://play.google.com/console → Create app
2. **App content** → fill privacy policy URL: `https://<your-domain>/privacy`
3. **Testing → Internal testing** → Create new release → upload `app-release.aab`
4. Add up to 100 tester emails, save & roll out.

Testers install via the opt-in URL Play gives you.

---

## Required permissions

Already declared by Capacitor + the recording flow:
- `RECORD_AUDIO` (microphone for studio)
- `INTERNET` (Supabase + Stripe)
- `MODIFY_AUDIO_SETTINGS` (mixer)

If you add notifications, camera, or background audio later, declare them in
`android/app/src/main/AndroidManifest.xml` and add a Play Console data-safety
disclosure.

---

## Updating the app

Every new upload needs **`versionCode + 1`** (even by 1) and the **same keystore**.
Re-run steps 4 + 9.
