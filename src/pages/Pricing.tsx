import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Check, Crown, Zap, Sparkles, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type Tier = "free" | "premium" | "vip";
type Interval = "monthly" | "yearly";

const PRICES = {
  premium: { monthly: { id: "premium_monthly_1299", label: "$12.99/mo" }, yearly: { id: "premium_yearly_80", label: "$80/yr (save ~$76)" } },
  vip: { monthly: { id: "vip_monthly_22", label: "$22/mo" }, yearly: { id: "vip_yearly_160", label: "$160/yr (save $104)" } },
} as const;

const TIERS: {
  id: Tier; name: string; tagline: string;
  Icon: typeof Crown; accent: string; perks: string[];
}[] = [
  {
    id: "free", name: "Free", tagline: "Studio + uploads always free",
    Icon: Sparkles, accent: "text-muted-foreground border-border",
    perks: ["3 drops a day", "Free studio + uploads", "Vote in Beat of the Day", "Public chatrooms + crews"],
  },
  {
    id: "premium", name: "Platinum", tagline: "Step up",
    Icon: Zap, accent: "text-primary border-primary/40",
    perks: ["4 drops a day", "1 free Send-to-Live-Radio", "Unlimited weekly contests", "Platinum badge"],
  },
  {
    id: "vip", name: "VIP", tagline: "Top tier",
    Icon: Crown, accent: "text-accent border-accent/40",
    perks: ["5 drops a day", "1 free Send-to-Live-Radio", "Unlimited weekly contests", "VIP-only rooms & badge"],
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [busyTier, setBusyTier] = useState<Tier | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const { openCheckout, closeCheckout, checkoutElement, isOpen } = useStripeCheckout();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      let env: "sandbox" | "live" | null = null;
      try { env = getStripeEnvironment(); } catch { env = null; }
      let q = supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (env) q = q.eq("environment", env);
      const { data } = await q.maybeSingle();
      setTier((data?.tier as Tier) ?? "free");
      setLoading(false);
    })();
  }, [user?.id]);

  const upgrade = (t: Exclude<Tier, "free">) => {
    if (!user) {
      toast.error("Sign in to upgrade");
      return;
    }
    setBusyTier(t);
    try {
      openCheckout({
        priceId: PRICES[t][interval].id,
        customerEmail: user.email,
        userId: user.id,
        returnUrl: `${window.location.origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      });
    } finally {
      setBusyTier(null);
    }
  };

  const manage = async () => {
    setPortalBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: `${window.location.origin}/pricing`, environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Could not open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEO
        title="Pricing — Cash Stage Platinum & VIP"
        description="Cash Stage subscription tiers: Free (3 drops/day), Platinum ($12.99/mo, 4 drops + radio perk), VIP ($22/mo, 5 drops + radio perk). Yearly saves up to $104. Studio and uploads are always free."
        path="/pricing"
      />
      <PaymentTestModeBanner />
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Pricing</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <div className="text-center mb-2">
          <p className="font-display text-2xl">Where Bars Turn Into Bankrolls</p>
          <p className="text-sm text-muted-foreground mt-1">No drama. Studio and uploads are free for everyone — battlers 18+.</p>
        </div>

        {/* Interval toggle */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${interval === "monthly" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${interval === "yearly" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            Yearly · save up to $104
          </button>
        </div>

        {!loading && tier !== "free" && (
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground tracking-widest">
              CURRENT: <span className="text-primary font-bold">{tier.toUpperCase()}</span>
            </p>
            <Button size="sm" variant="ghost" onClick={manage} disabled={portalBusy} className="gap-2">
              {portalBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
              Manage
            </Button>
          </div>
        )}

        {TIERS.map(t => {
          const Icon = t.Icon;
          const current = tier === t.id;
          const priceLabel = t.id === "free" ? "$0" : PRICES[t.id as Exclude<Tier, "free">][interval].label;
          return (
            <div key={t.id} className={`rounded-2xl border-2 p-4 bg-card ${t.accent} ${current ? "ring-2 ring-primary/40" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <p className="font-display text-xl">{t.name}</p>
                </div>
                <p className="font-display text-lg">{priceLabel}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t.tagline}</p>
              <ul className="space-y-1.5 mb-4">
                {t.perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {t.id !== "free" && (
                <Button
                  className="w-full"
                  onClick={() => upgrade(t.id as Exclude<Tier, "free">)}
                  disabled={current || busyTier === t.id}
                >
                  {busyTier === t.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {current ? "Your current plan" : `Upgrade to ${t.name}`}
                </Button>
              )}
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center">
          Prices in USD, exclude tax. Cancel anytime in Manage. Battlers must be 18+.
        </p>
      </div>

      {/* Embedded checkout overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4">
            <button onClick={closeCheckout} className="mb-4 text-sm text-muted-foreground underline">
              ← Close
            </button>
            {checkoutElement}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pricing;
