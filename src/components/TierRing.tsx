import { Crown } from "lucide-react";
import type { ReactNode } from "react";

export type RingTier = "free" | "premium" | "platinum" | "vip";

/** Silver ring = Platinum/Premium, gold ring = VIP. Free members get a plain border. */
export const ringClass = (tier: RingTier) =>
  tier === "vip"
    ? "ring-4 ring-accent shadow-[0_0_18px_hsl(var(--accent)/0.55)]"
    : tier === "premium" || tier === "platinum"
    ? "ring-4 ring-muted-foreground shadow-[0_0_14px_hsl(var(--muted-foreground)/0.45)]"
    : "ring-2 ring-border";

export const tierLabel = (tier: RingTier) =>
  tier === "vip" ? "VIP" : tier === "premium" || tier === "platinum" ? "PLATINUM" : "FREE";

export const TierBadge = ({ tier, className = "" }: { tier: RingTier; className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
      tier === "vip"
        ? "text-accent border-accent/60 bg-accent/15"
        : tier === "premium"
        ? "text-muted-foreground border-border bg-secondary"
        : "text-muted-foreground border-border bg-secondary"
    } ${className}`}
  >
    {tier !== "free" && <Crown className="h-3 w-3" />}
    {tierLabel(tier)}
  </span>
);

/** Wraps an avatar so the tier ring renders around it. */
const TierRing = ({
  tier,
  children,
  className = "",
}: {
  tier: RingTier;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`rounded-2xl overflow-hidden ${ringClass(tier)} ${className}`} aria-label={`${tierLabel(tier)} member`}>
    {children}
  </div>
);

export default TierRing;
