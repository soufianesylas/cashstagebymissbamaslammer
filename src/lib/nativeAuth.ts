/**
 * Native Android Google sign-in via Chrome Custom Tabs.
 *
 * Why this exists:
 *   Google blocks OAuth inside embedded WebViews (the Capacitor WebView) with
 *   the `disallowed_useragent` error. The fix is to launch the OAuth URL in
 *   Chrome Custom Tabs (a real browser surface) via @capacitor/browser, then
 *   catch the redirect back into the app via a custom-scheme deep link and
 *   hand the tokens to supabase.auth.setSession.
 *
 * Required manual configuration (one-time, on the developer machine):
 *
 *   1. AndroidManifest.xml — add an intent-filter inside the MainActivity
 *      <activity> tag so Android routes the deep link to the app:
 *
 *        <intent-filter android:autoVerify="false">
 *          <action android:name="android.intent.action.VIEW" />
 *          <category android:name="android.intent.category.DEFAULT" />
 *          <category android:name="android.intent.category.BROWSABLE" />
 *          <data android:scheme="com.missbamaslammer.cashstage" />
 *        </intent-filter>
 *
 *   2. Lovable Cloud → Users → Auth Settings → URL Configuration —
 *      add this redirect URL to the allow-list:
 *
 *        com.missbamaslammer.cashstage://oauth-callback
 *
 * On web, this module is a no-op — callers should fall back to the regular
 * lovable.auth.signInWithOAuth() flow.
 */

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { recordAuthError } from "@/lib/authDebug";

export const NATIVE_OAUTH_REDIRECT = "com.missbamaslammer.cashstage://oauth-callback";

export const isNativeAndroid = (): boolean =>
  Capacitor.getPlatform?.() === "android";

/**
 * Launches Google sign-in in Chrome Custom Tabs and resolves once the deep
 * link returns with tokens (or rejects on error / user cancel).
 */
export const signInWithGoogleNative = async (): Promise<void> => {
  // Ask supabase for the provider URL but DON'T let it auto-redirect the
  // in-app WebView (which would re-trigger disallowed_useragent).
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    throw error ?? new Error("Could not start Google sign-in");
  }

  // Promise that resolves when the deep link comes back, with a safety
  // timeout so a closed browser doesn't leave us hanging forever.
  const waitForCallback = new Promise<void>((resolve, reject) => {
    let settled = false;

    const handle = App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
      if (!event.url?.startsWith(NATIVE_OAUTH_REDIRECT)) return;
      try {
        // Tokens come back in the URL hash (#access_token=...&refresh_token=...)
        const hash = event.url.split("#")[1] ?? "";
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const errDesc = params.get("error_description");
        if (errDesc) throw new Error(errDesc);
        if (!access_token || !refresh_token) {
          throw new Error("Missing tokens in OAuth callback");
        }
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setErr) throw setErr;
        settled = true;
        await Browser.close().catch(() => undefined);
        (await handle).remove();
        resolve();
      } catch (e) {
        settled = true;
        (await handle).remove();
        reject(e);
      }
    });

    // If the user closes the Custom Tab without finishing, surface a cancel.
    Browser.addListener("browserFinished", async () => {
      if (settled) return;
      settled = true;
      (await handle).remove();
      reject(new Error("Sign-in cancelled"));
    });
  });

  await Browser.open({ url: data.url, presentationStyle: "popover" });
  await waitForCallback;
};
