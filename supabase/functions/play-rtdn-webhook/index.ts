// Edge function: play-rtdn-webhook
// Receives Google Play Real-Time Developer Notifications via Cloud Pub/Sub push.
// Pub/Sub wraps the payload as: { message: { data: <base64 JSON>, ... }, subscription: "..." }
//
// We re-verify every subscription/one-time purchase against the Play Developer
// API (same path as verify-purchase), then update wallets/subscriptions.
//
// IMPORTANT: this endpoint is public (verify_jwt = false). We protect it by:
//   1. Optional shared secret in the URL: ?token=$PLAY_RTDN_PUSH_TOKEN
//      (configure the same token on the Pub/Sub push subscription URL)
//   2. Re-validating the purchase token with Google before granting anything
//
// Required runtime secrets:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//   - GOOGLE_PLAY_PACKAGE_NAME
//   - GOOGLE_PLAY_SERVICE_ACCOUNT
//   - PLAY_RTDN_PUSH_TOKEN (optional shared secret, recommended)

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SubscriptionNotification.notificationType values (Play docs).
const SUB_ACTIVE_STATES = new Set([
  1, // RECOVERED
  2, // RENEWED
  4, // PURCHASED
  7, // RESTARTED
]);
const SUB_INACTIVE_STATES = new Set([
  3,  // CANCELED
  5,  // ON_HOLD
  6,  // IN_GRACE_PERIOD
  10, // PAUSED
  12, // REVOKED
  13, // EXPIRED
]);

// Map productId → tier (must mirror verify-purchase / billing.ts)
const SUB_TIER: Record<string, "platinum" | "vip"> = {
  sub_platinum_monthly: "platinum",
  sub_vip_monthly: "vip",
};

async function googleAccessToken(): Promise<string | null> {
  const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!saJson) return null;
  const sa = JSON.parse(saJson);
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: any) =>
    btoa(JSON.stringify(o)).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${sigB64}`;
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokRes.json();
  return access_token ?? null;
}

async function fetchSubscription(pkg: string, sku: string, token: string, accessToken: string) {
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptions/${sku}/tokens/${token}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  return await res.json();
}

async function fetchProduct(pkg: string, sku: string, token: string, accessToken: string) {
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/products/${sku}/tokens/${token}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  // 1. Optional shared-secret check
  const expectedToken = Deno.env.get("PLAY_RTDN_PUSH_TOKEN");
  if (expectedToken) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== expectedToken) {
      console.warn("play-rtdn-webhook: bad or missing push token");
      return new Response("forbidden", { status: 403, headers: cors });
    }
  }

  // 2. Decode Pub/Sub envelope
  let envelope: any;
  try {
    envelope = await req.json();
  } catch {
    return new Response("bad json", { status: 400, headers: cors });
  }
  const dataB64 = envelope?.message?.data;
  if (!dataB64) {
    // Pub/Sub sends an empty test message during subscription setup — ACK it.
    return new Response("ok", { status: 200, headers: cors });
  }

  let payload: any;
  try {
    payload = JSON.parse(atob(dataB64));
  } catch (e) {
    console.error("play-rtdn-webhook: failed to decode data", e);
    return new Response("bad payload", { status: 400, headers: cors });
  }

  console.log("play-rtdn", JSON.stringify({
    packageName: payload.packageName,
    sub: payload.subscriptionNotification?.notificationType,
    oneTime: payload.oneTimeProductNotification?.notificationType,
    voided: !!payload.voidedPurchaseNotification,
    test: !!payload.testNotification,
  }));

  if (payload.testNotification) {
    return new Response("ok", { status: 200, headers: cors });
  }

  const pkg = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  if (!pkg || payload.packageName !== pkg) {
    console.warn("play-rtdn-webhook: package mismatch", payload.packageName, "vs", pkg);
    // ACK anyway so Pub/Sub doesn't retry forever on a misroute.
    return new Response("ok", { status: 200, headers: cors });
  }

  const accessToken = await googleAccessToken();
  if (!accessToken) {
    console.error("play-rtdn-webhook: missing Google service account");
    // 500 → Pub/Sub will retry, which is what we want for transient config issues.
    return new Response("server not configured", { status: 500, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // --- Subscription lifecycle ---
    const subNote = payload.subscriptionNotification;
    if (subNote) {
      const sku = subNote.subscriptionId;
      const token = subNote.purchaseToken;
      const tier = SUB_TIER[sku];
      if (!tier) {
        console.warn("play-rtdn-webhook: unknown subscription sku", sku);
        return new Response("ok", { status: 200, headers: cors });
      }
      const sub = await fetchSubscription(pkg, sku, token, accessToken);
      if (!sub) {
        console.error("play-rtdn-webhook: could not fetch subscription from Google");
        return new Response("ok", { status: 200, headers: cors });
      }
      // Resolve user via the obfuscatedExternalAccountId we set at purchase time,
      // or fall back to the developerPayload. If we don't have it, log + ACK.
      const userId =
        sub.obfuscatedExternalAccountId ??
        sub.developerPayload ??
        null;
      if (!userId) {
        console.warn("play-rtdn-webhook: subscription has no userId mapping", { sku, token });
        return new Response("ok", { status: 200, headers: cors });
      }

      const type = subNote.notificationType;
      const periodEnd = sub.expiryTimeMillis ? new Date(Number(sub.expiryTimeMillis)) : null;

      if (SUB_ACTIVE_STATES.has(type)) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          tier,
          status: "active",
          current_period_end: periodEnd?.toISOString() ?? null,
        }, { onConflict: "user_id" });
      } else if (SUB_INACTIVE_STATES.has(type)) {
        await supabase.from("subscriptions").update({
          status: type === 13 ? "expired" : type === 12 ? "revoked" : "canceled",
          current_period_end: periodEnd?.toISOString() ?? null,
        }).eq("user_id", userId);
      }
      // Other notificationType values (price change, deferred replace, etc.)
      // are logged above and ACKed without state changes.
    }

    // --- Voided purchase (refund / chargeback) ---
    const voided = payload.voidedPurchaseNotification;
    if (voided?.purchaseToken) {
      // Revoke any boost rows tied to this purchase token. We store the
      // purchase_token on track_boosts when grants are issued; if a refund
      // hits, zero them out so the artist can't keep playing/voting on a
      // refunded boost.
      await supabase
        .from("track_boosts")
        .update({ plays_remaining: 0, votes_remaining: 0 })
        .eq("purchase_token", voided.purchaseToken);
    }

    // --- One-time product (consumables) ---
    const otp = payload.oneTimeProductNotification;
    if (otp) {
      // We grant boosts at purchase time in verify-purchase; nothing to do here
      // except log. Future: reconcile if a purchase was never client-verified.
      const prod = await fetchProduct(pkg, otp.sku, otp.purchaseToken, accessToken);
      console.log("play-rtdn one-time", { sku: otp.sku, state: prod?.purchaseState });
    }

    return new Response("ok", { status: 200, headers: cors });
  } catch (e) {
    console.error("play-rtdn-webhook error", e);
    // 500 → Pub/Sub retries with exponential backoff
    return new Response("error", { status: 500, headers: cors });
  }
});
