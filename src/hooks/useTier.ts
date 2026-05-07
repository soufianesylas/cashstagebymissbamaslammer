import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tier } from "@/components/AdGate";

export const useTier = (): Tier => {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  useEffect(() => {
    if (!user) { setTier("free"); return; }
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setTier(((data?.tier as Tier) ?? "free")));
  }, [user?.id]);
  return tier;
};
