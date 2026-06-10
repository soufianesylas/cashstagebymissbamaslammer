# Android Google Sign-in (Chrome Custom Tabs)

Google blocks OAuth flows that run inside embedded WebViews with the
`disallowed_useragent` error. Cash Stage handles this by routing the Google
sign-in flow through **Chrome Custom Tabs** via `@capacitor/browser`, then
catching the redirect back into the app through a **custom-scheme deep link**.

The runtime code lives in [`src/lib/nativeAuth.ts`](../src/lib/nativeAuth.ts).
Two one-time configuration steps must be done on a developer machine after
`npx cap add android`:

## 1. Add the deep-link intent-filter

Open `android/app/src/main/AndroidManifest.xml` and add the following
`<intent-filter>` **inside the existing `<activity android:name=".MainActivity" ...>`
tag**, next to the launcher intent-filter that's already there:

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.missbamaslammer.cashstage" />
</intent-filter>
```

Then rebuild:

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 2. Allow-list the redirect URL in Lovable Cloud

In **Lovable Cloud → Users → Auth Settings → URL Configuration**, add this
redirect URL to the allow-list:

```
com.missbamaslammer.cashstage://oauth-callback
```

Without this entry, Supabase will refuse the OAuth callback and the
sign-in will fail with `redirect_to is not allowed`.

## 3. Verifying

After both steps:

1. Install the debug build on a real device.
2. Tap **Continue with Google** on the auth screen.
3. Chrome Custom Tabs opens, you complete Google sign-in, then the app
   reopens and lands on `/app` signed in.

If Chrome Custom Tabs opens but the app never resumes after sign-in, the
intent-filter is missing or the scheme is misspelled. If Google shows
`redirect_uri is not allowed`, the Cloud allow-list entry is missing.
