# Cash Stage — Prototype Build (Capacitor)

This is a one-page guide to producing an installable prototype on a real
Android phone or iOS device. Backend (Lovable Cloud) is already live, so the
mobile app only wraps the web build.

---

## 0. Prerequisites

- Node 18+ and `npm`
- **Android**: Android Studio (with an emulator or a USB-debug phone)
- **iOS**: macOS with Xcode 15+ and an Apple ID

## 1. Pull the project to your machine

1. In Lovable, click **GitHub → Connect to GitHub** and push the repo.
2. On your computer:
   ```bash
   git clone <your-repo-url>
   cd <repo>
   npm install
   ```

## 2. Add the native platforms (one-time)

```bash
npx cap add android
npx cap add ios       # macOS only
```

> The `appId` is already set to `com.missbamaslammer.cashstage` in
> `capacitor.config.ts`. Do **not** change it — it's permanent on Play Store.

## 3. Pick a build mode

### A. Hot-reload prototype (fastest — points at the Lovable sandbox)
Default mode. Changes you make in Lovable appear instantly on the device.
```bash
npm run build
npx cap sync
npx cap run android        # or: npx cap run ios
```

### B. Standalone prototype (bundled, works offline of Lovable)
```bash
CAP_ENV=prod npm run build
npx cap sync
npx cap run android
```

## 4. Generate an installable artifact

### Android APK (share-able link/file)
```bash
cd android
./gradlew assembleDebug
# APK lands at: android/app/build/outputs/apk/debug/app-debug.apk
```
Send the APK to testers; they enable "Install unknown apps" and tap it.

### iOS (TestFlight)
```bash
npx cap open ios
```
In Xcode: select your team, **Product → Archive**, then **Distribute → TestFlight**.

## 5. Whenever you pull new Lovable changes

```bash
git pull
npm install
npm run build
npx cap sync
```

That's it. No store submission needed for prototype testing.
