import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * 30-second ad gate for free users.
 * - Tries the native AdMob rewarded ad through Capacitor's runtime plugin registry.
 * - Falls back to a 30s house-promo countdown modal so the flow is Play Store ready
 *   without a real ad network configured yet.
 *
 * Usage:
 *   const ad = useAdGate(tier);
 *   await ad.gate();           // resolves when ad/countdown finishes
 *   <ad.View />                 // mount once near root
 */
export type Tier = "free" | "platinum" | "vip";

let pendingResolve: (() => void) | null = null;

export const playRewardedAd = async (): Promise<boolean> => {
  // Try native AdMob if the plugin is installed and we're on a device
  try {
    // Do not import the optional native package in web builds; Vite would try to resolve it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capacitor = (window as any).Capacitor;
    const adMob = capacitor?.Plugins?.AdMob;
    if (adMob && typeof adMob.prepareRewardVideoAd === "function") {
      // Test ad unit IDs from Google. Replace with real IDs before production.
      const adId =
        capacitor?.getPlatform?.() === "ios"
          ? "ca-app-pub-3940256099942544/1712485313"
          : "ca-app-pub-3940256099942544/5224354917";
      await adMob.initialize({});
      await adMob.prepareRewardVideoAd({ adId });
      await adMob.showRewardVideoAd();
      return true;
    }
  } catch {
    /* fall through to stub */
  }
  return false;
};

export const AdGateProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!open) return;
    setSeconds(30);
    const i = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(i);
          setOpen(false);
          pendingResolve?.();
          pendingResolve = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [open]);

  // Expose a window-scoped opener used by gateAd()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__openAdStub = (resolve: () => void) => {
      pendingResolve = resolve;
      setOpen(true);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).__openAdStub; };
  }, []);

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={() => { /* locked until countdown */ }}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Sponsored · {seconds}s</DialogTitle>
            <DialogDescription>
              Free accounts watch a short promo. Upgrade to skip ads.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center">
            <p className="font-display text-2xl">Cashstage</p>
            <p className="text-xs text-muted-foreground mt-1">
              100% human bars. Real prizes. Real votes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-primary/40 p-3 bg-primary/5 text-center">
              <Sparkles className="h-4 w-4 text-primary mx-auto" />
              <p className="font-display text-sm mt-1">Platinum</p>
              <p className="text-[10px] text-muted-foreground">No ads</p>
            </div>
            <div className="rounded-xl border border-accent/40 p-3 bg-accent/5 text-center">
              <Crown className="h-4 w-4 text-accent mx-auto" />
              <p className="font-display text-sm mt-1">VIP</p>
              <p className="text-[10px] text-muted-foreground">No ads · perks</p>
            </div>
          </div>
          <Link to="/pricing" className="w-full">
            <Button variant="outline" className="w-full">Upgrade & skip ads</Button>
          </Link>
          <p className="text-center text-[10px] text-muted-foreground">
            Ad finishes in {seconds}s
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Resolves after a real rewarded ad or 30s stub. No-op for paid tiers. */
export const gateAd = async (tier: Tier): Promise<void> => {
  if (tier !== "free") return;
  const native = await playRewardedAd();
  if (native) return;
  await new Promise<void>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opener = (window as any).__openAdStub as undefined | ((cb: () => void) => void);
    if (!opener) { resolve(); return; }
    opener(resolve);
  });
};
