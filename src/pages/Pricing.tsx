import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Check, Crown, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEO from "@/components/SEO";

type Tier = "free" | "platinum" | "vip";

const TIERS: {
  id: Tier; name: string; priceLabel: string; tagline: string;
  Icon: typeof Crown; accent: string; perks: string[];
}[] = [
  {
    id: "free", name: "Free", priceLabel: "$0", tagline: "Get on stage",
    Icon: Sparkles, accent: "text-muted-foreground border-border",
    perks: ["3 drops a day", "1 weekly contest entry", "Vote in Beat of the Day", "Public chatrooms + crews"],
  },
  {
    id: "platinum", name: "Platinum", priceLabel: "$15/mo", tagline: "Step up",
    Icon: Zap, accent: "text-primary border-primary/40",
    perks: ["5 drops a day", "Unlimited weekly contests", "Featured-track discounts", "Platinum badge"],
  },
  {
    id: "vip", name: "VIP", priceLabel: "$20/mo", tagline: "Front of the line",
    Icon: Crown, accent: "text-accent border-accent/40",
    perks: ["6 drops a day", "Front-of-line on one weekly contest", "Extra voice effects", "VIP-only lists & rooms"],
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from("subscriptions").select("tier").eq("user_id", user.id).maybeSingle();
      setTier((data?.tier as Tier) ?? "free");
      setLoading(false);
    })();
  }, [user?.id]);

  const upgrade = (t: Tier) => {
    toast("Payments not enabled yet", {
      description: "Tap your Lovable AI assistant to wire up Stripe checkout when you're ready.",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEO
        title="Pricing — Cash Stage Platinum & VIP Tiers"
        description="Cash Stage subscription tiers: Free, Platinum ($15/mo), and VIP ($20/mo). More drops, contest entries, badges, and front-of-line perks."
        path="/pricing"
        schema={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Cash Stage Membership",
          description: "Subscription tiers for Cash Stage: Free, Platinum, and VIP.",
          brand: { "@type": "Brand", name: "Cash Stage" },
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
            { "@type": "Offer", name: "Platinum", price: "15", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "15", priceCurrency: "USD", billingIncrement: 1, unitCode: "MON" } },
            { "@type": "Offer", name: "VIP", price: "20", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "20", priceCurrency: "USD", billingIncrement: 1, unitCode: "MON" } },
          ],
        }}
      />
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
          <p className="text-sm text-muted-foreground mt-1">Pick the tier that matches your hustle.</p>
        </div>

        {!loading && (
          <p className="text-center text-[10px] text-muted-foreground tracking-widest">
            CURRENT PLAN: <span className="text-primary font-bold">{tier.toUpperCase()}</span>
          </p>
        )}

        {TIERS.map(t => {
          const Icon = t.Icon;
          const current = tier === t.id;
          return (
            <div key={t.id} className={`rounded-2xl border-2 p-4 bg-card ${t.accent} ${current ? "ring-2 ring-primary/40" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <p className="font-display text-xl">{t.name}</p>
                </div>
                <p className="font-display text-2xl">{t.priceLabel}</p>
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
                <Button className="w-full" onClick={() => upgrade(t.id)} disabled={current}>
                  {current ? "Your current plan" : `Upgrade to ${t.name}`}
                </Button>
              )}
            </div>
          );
        })}

        <div className="rounded-xl bg-secondary p-3 text-[11px] text-muted-foreground space-y-1">
          <p>📊 <b>How the app pays for itself:</b> 5% gateway fees + 50¢ per subscription, $10 featured-track submissions (50% refunded as in-app CSB if denied), 15% platform cut on beat marketplace sales.</p>
          <p>🎁 <b>Producers always profit:</b> recurring small payouts every time their beat is used in a recording.</p>
          <p>Prices shown exclude tax. Free users can enter ONE weekly contest per week.</p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
