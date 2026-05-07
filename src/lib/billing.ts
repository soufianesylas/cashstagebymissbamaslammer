/**
 * Google Play Billing wrapper.
 *
 * Strategy:
 * - On the web preview, fall back to a mock checkout dialog so the flow is
 *   testable end-to-end without a real Play Console.
 * - On a real Android device, dynamically resolve the Capacitor In-App
 *   Purchase plugin (e.g. `@capacitor-community/in-app-purchases` or
 *   RevenueCat's `@revenuecat/purchases-capacitor`). The plugin must be
 *   installed locally before `npx cap sync` — we never bundle it for web.
 * - After a successful purchase the receipt is forwarded to the
 *   `verify-purchase` edge function, which validates with Google and updates
 *   the user's wallet / subscription server-side.
 *
 * Required Play Console setup (before live release):
 *   1. Create the app in Play Console with appId `com.missbamaslammer.cashstage`
 *   2. Configure all in-app products / subscriptions with the SKUs listed below
 *   3. Add a service account with "Financial reports" + "Manage orders" perms,
 *      download the JSON, and store it as the `GOOGLE_PLAY_SERVICE_ACCOUNT`
 *      secret (used by the verify-purchase edge function)
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Sku =
  | "boost_25"
  | "boost_50"
  | "sub_platinum_monthly"
  | "sub_vip_monthly";

export const SKU_CATALOG: Record<Sku, { label: string; priceUsd: number; kind: "consumable" | "subscription"; grants: string }> = {
  boost_25:             { label: "25 Plays + 25 Votes", priceUsd: 4.99, kind: "consumable",   grants: "25-pack track boost" },
  boost_50:             { label: "50 Plays + 50 Votes", priceUsd: 8.99, kind: "consumable",   grants: "50-pack track boost" },
  sub_platinum_monthly: { label: "Platinum (monthly)",  priceUsd: 9.99, kind: "subscription", grants: "Ad-free + extra drops" },
  sub_vip_monthly:      { label: "VIP (monthly)",       priceUsd: 19.99, kind: "subscription", grants: "Everything + VIP perks" },
};

const isNativeAndroid = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (typeof window !== "undefined" ? (window as any).Capacitor : null);
  return cap?.getPlatform?.() === "android";
};

const getNativePlugin = (): any | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (typeof window !== "undefined" ? (window as any).Capacitor : null);
  return cap?.Plugins?.InAppPurchases ?? cap?.Plugins?.Purchases ?? null;
};

interface PurchaseReceipt {
  sku: Sku;
  purchase_token: string;
  order_id?: string;
  platform: "android" | "web_mock";
}

const verifyOnServer = async (receipt: PurchaseReceipt): Promise<boolean> => {
  const { data, error } = await supabase.functions.invoke("verify-purchase", { body: receipt });
  if (error) {
    toast.error(`Verification failed: ${error.message}`);
    return false;
  }
  if (!data?.granted) {
    toast.error("Purchase could not be verified");
    return false;
  }
  return true;
};

export const purchase = async (sku: Sku, opts?: { trackId?: string }): Promise<boolean> => {
  const meta = SKU_CATALOG[sku];
  if (!meta) { toast.error("Unknown product"); return false; }

  // --- Native Android path ---
  if (isNativeAndroid()) {
    const plugin = getNativePlugin();
    if (!plugin) {
      toast.error("Billing not available — Play Billing plugin missing");
      return false;
    }
    try {
      const result = await plugin.purchaseProduct({ productId: sku });
      const receipt: PurchaseReceipt = {
        sku,
        purchase_token: result.purchaseToken ?? result.transactionId,
        order_id: result.orderId,
        platform: "android",
      };
      const ok = await verifyOnServer(receipt);
      if (ok && meta.kind === "consumable" && plugin.consumePurchase) {
        await plugin.consumePurchase({ purchaseToken: receipt.purchase_token });
      }
      return ok;
    } catch (e: any) {
      if (!`${e?.message ?? ""}`.toLowerCase().includes("cancel")) {
        toast.error(e?.message ?? "Purchase failed");
      }
      return false;
    }
  }

  // --- Web mock path ---
  const confirmed = window.confirm(
    `MOCK CHECKOUT (web preview)\n\n${meta.label} — $${meta.priceUsd.toFixed(2)}\n${meta.grants}\n\nProceed?`
  );
  if (!confirmed) return false;
  const mockReceipt: PurchaseReceipt = {
    sku,
    purchase_token: `mock-${crypto.randomUUID()}`,
    platform: "web_mock",
  };
  // Pass trackId for boost SKUs through the metadata channel
  const { data, error } = await supabase.functions.invoke("verify-purchase", {
    body: { ...mockReceipt, track_id: opts?.trackId },
  });
  if (error || !data?.granted) {
    toast.error(error?.message ?? "Mock purchase failed");
    return false;
  }
  toast.success("Purchase complete (mock)");
  return true;
};
