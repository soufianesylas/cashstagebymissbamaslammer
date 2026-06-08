import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function resolvePriceLookup(item: any): string | null {
  return item?.price?.lookup_key
    ?? item?.price?.metadata?.lovable_external_id
    ?? null;
}

async function applyTier(subscription: any, env: StripeEnv, statusOverride?: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceLookup = resolvePriceLookup(item);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const status = statusOverride ?? subscription.status;

  const { error } = await getSupabase().rpc("apply_subscription_tier", {
    _user_id: userId,
    _price_id: priceLookup,
    _stripe_subscription_id: subscription.id,
    _stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
    _status: status,
    _current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    _current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    _cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    _environment: env,
  });
  if (error) console.error("apply_subscription_tier error:", error);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await applyTier(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await applyTier(event.data.object, env, "canceled");
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
