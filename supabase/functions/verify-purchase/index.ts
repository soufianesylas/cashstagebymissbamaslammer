// Edge function: verify-purchase
// Validates a Google Play purchase token against Google's API and grants the
// appropriate boost / subscription. On the web preview it accepts mock receipts
// (platform === "web_mock") so the full flow can be tested without Play Console.
//
// Required runtime secrets:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto)
//   - GOOGLE_PLAY_PACKAGE_NAME (e.g. "com.missbamaslammer.cashstage")
//   - GOOGLE_PLAY_SERVICE_ACCOUNT (full JSON for a service account with
//     "View financial data" + "Manage orders" perms in Play Console)
//
// On a real Android build, when you submit your first AAB, also link the
// service account to your app in Play Console → Setup → API access.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  sku: string;
  purchase_token: string;
  order_id?: string;
  platform: "android" | "web_mock";
  track_id?: string;
}

const SKU_GRANTS: Record<string, { kind: "boost" | "sub"; pack?: string; plays?: number; votes?: number; tier?: "platinum" | "vip" }> = {
  boost_25:             { kind: "boost", pack: "25_pack", plays: 25, votes: 25 },
  boost_50:             { kind: "boost", pack: "50_pack", plays: 50, votes: 50 },
  sub_platinum_monthly: { kind: "sub", tier: "platinum" },
  sub_vip_monthly:      { kind: "sub", tier: "vip" },
};

// Minimal Google API call — uses a service account JWT to fetch a token,
// then verifies the purchase via Play Developer API v3.
async function verifyWithGoogle(sku: string, token: string): Promise<boolean> {
  const pkg = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!pkg || !saJson) {
    console.warn("verify-purchase: Google secrets not configured — denying");
    return false;
  }
  const sa = JSON.parse(saJson);
  // Build a JWT
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: any) => btoa(JSON.stringify(o)).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const sigB64 = btoa(String.fromCharCode(...sig)).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${sigB64}`;

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokRes.json();
  if (!access_token) return false;

  const grant = SKU_GRANTS[sku];
  const path = grant?.kind === "sub"
    ? `subscriptions/${sku}/tokens/${token}`
    : `products/${sku}/tokens/${token}`;
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/${path}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  if (!res.ok) return false;
  const json = await res.json();
  // For products: purchaseState 0 = purchased, 1 = canceled
  // For subs: paymentState 1 = received
  if (grant?.kind === "sub") return json.paymentState === 1;
  return json.purchaseState === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body: Body = await req.json();
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "no user" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const grant = SKU_GRANTS[body.sku];
    if (!grant) return new Response(JSON.stringify({ error: "unknown sku" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    let valid = false;
    if (body.platform === "android") {
      valid = await verifyWithGoogle(body.sku, body.purchase_token);
    } else if (body.platform === "web_mock") {
      // Mock checkout is only valid when explicitly enabled (never in production).
      if (Deno.env.get("ALLOW_MOCK_PURCHASES") === "true") {
        valid = true;
      } else {
        console.warn("verify-purchase: web_mock attempted but ALLOW_MOCK_PURCHASES is not enabled");
        return new Response(JSON.stringify({ granted: false, reason: "mock_disabled" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }
    if (!valid) {
      return new Response(JSON.stringify({ granted: false, reason: "verify_failed" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Apply grant server-side (service role bypasses RLS)
    if (grant.kind === "boost") {
      if (!body.track_id) return new Response(JSON.stringify({ granted: false, reason: "missing_track" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      const { data: tr } = await supabase.from("tracks").select("user_id").eq("id", body.track_id).maybeSingle();
      if (!tr || tr.user_id !== user.id) {
        return new Response(JSON.stringify({ granted: false, reason: "not_track_owner" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
      }
      await supabase.from("track_boosts").insert({
        track_id: body.track_id, owner_id: user.id, pack: grant.pack!,
        plays_remaining: grant.plays!, votes_remaining: grant.votes!,
        purchase_token: body.purchase_token,
      });
    } else if (grant.kind === "sub") {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await supabase.from("subscriptions").upsert({
        user_id: user.id, tier: grant.tier!, status: "active", current_period_end: periodEnd.toISOString(),
      }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ granted: true, sku: body.sku }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("verify-purchase error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
