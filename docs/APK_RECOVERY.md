# Recovered production APK — reference facts

Source: `59 (1).apk`, pulled from the live Google Play release.

| Item | Value |
| --- | --- |
| Play application id (**must never change**) | `com.cash.missalabamaslammer.cashstage` |
| Published versionCode | `59` (next upload must be higher) |
| Framework | Capacitor (Android WebView shell) |
| Bundled `capacitor.config.json` `appId` | `app.cashstage` (legacy Android *namespace* only) |
| Bundled `appName` | `cashstagebymissbamaslammer` |
| Old web host referenced in manifest | `cashstagebymissbamaslammer-main.vercel.app` |
| Backend in the bundle | Supabase (no Firebase) |
| Screens present in the bundle | Home, Battles, Studio, Collab, Wallet |

## The `app.cashstage` vs `com.cash.missalabamaslammer.cashstage` discrepancy

In the recovered build the Capacitor `appId` (`app.cashstage`) was used only as the
Android **namespace** — the Java package for `MainActivity` and generated classes.
The Gradle `applicationId`, which is what Google Play identifies the app by, was
overridden to `com.cash.missalabamaslammer.cashstage`.

This project now sets Capacitor's `appId` directly to the published
`com.cash.missalabamaslammer.cashstage`, so namespace and applicationId match.
That is safe: Play identifies an app by `applicationId` + signing key, not by the
Java namespace, and the Activity class name is not part of the store identity.

## Enforcement in this repo

- `capacitor.config.ts` → `appId: 'com.cash.missalabamaslammer.cashstage'`
- `scripts/verify-aab.mjs` hard-fails any bundle whose package id differs.
- `.release-history.json` is seeded with `lastVersionCode: 59`, so the verifier
  rejects any bundle at or below the live release.
- `scripts/configure-android-release.mjs` injects the OAuth deep-link scheme
  `com.cash.missalabamaslammer.cashstage://oauth-callback` — this exact URL must
  also be on the backend auth redirect allow-list.
- `scripts/upload-play.mjs` defaults to the published package name.

## Still owner-side

- Upload key: the update must be signed with the same upload key as release 59.
  If it is lost, use Play Console → Setup → App integrity → request upload key reset.
- Play Console listing, data safety, and rollout are manual steps.
