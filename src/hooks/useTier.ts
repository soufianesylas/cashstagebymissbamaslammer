import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment } from "@/lib/stripe";
import type { Tier } from "@/components/AdGate";

export const useTier = (): Tier => {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  useEffect(() => {
    if (!user) { setTier("free"); return; }
    let env: "sandbox" | "live" | null = null;
    try { env = getStripeEnvironment(); } catch { env = null; }
    let q = supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (env) q = q.eq("environment", env);
    q.maybeSingle().then(({ data }) => setTier(((data?.tier as Tier) ?? "free")));
  }, [user?.id]);
  return tier;
};
