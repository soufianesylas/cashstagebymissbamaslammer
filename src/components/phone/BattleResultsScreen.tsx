import { Trophy, Share2, RotateCcw, Crown, Coins, ChevronLeft } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import rapperBlue from "@/assets/rapper-blue.jpg";

export interface BattleResultsScreenProps {
  winner?: "red" | "blue";
  redVotes?: number;
  blueVotes?: number;
  payoutCsb?: number;
  onBack?: () => void;
  onRematch?: () => void;
  onShare?: () => void;
}

const BattleResultsScreen = ({
  winner = "red",
  redVotes = 1840,
  blueVotes = 1210,
  payoutCsb = 1100,
  onBack,
  onRematch,
  onShare,
}: BattleResultsScreenProps = {}) => {
  const total = redVotes + blueVotes;
  const redPct = Math.round((redVotes / total) * 100);
  const bluePct = 100 - redPct;
  const isRed = winner === "red";

  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background relative">
      <div className={`absolute -top-10 left-1/2 -translate-x-1/2 h-56 w-40 blur-3xl animate-spotlight ${isRed ? "bg-destructive/40" : "bg-battle-blue/40"}`} />

      <div className="relative flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-display tracking-widest text-sm">RESULTS</p>
        <button onClick={onShare} aria-label="Share" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Winner card */}
      <div className="relative mx-3 mt-2 rounded-3xl overflow-hidden border border-accent/40 p-6 text-center animate-scale-in"
        style={{ background: "radial-gradient(ellipse at top, hsl(45 100% 25% / 0.5), hsl(0 0% 5%) 70%)" }}>
        <Crown className="absolute top-3 right-3 h-5 w-5 text-accent fill-accent" />
        <div className="relative mx-auto h-24 w-24 rounded-full overflow-hidden ring-4 ring-accent">
          <img src={isRed ? rapperRed : rapperBlue} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        <p className="text-[10px] text-accent tracking-widest mt-3 font-bold">WINNER</p>
        <p className="font-display text-3xl text-glow-gold mt-1">{isRed ? "RAPPER RED" : "RAPPER BLUE"}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/40">
          <Coins className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-bold text-accent">+{payoutCsb.toLocaleString()} CSB</span>
        </div>
      </div>

      {/* Vote bar */}
      <div className="mx-3 mt-4">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span className="text-destructive font-bold">RED · {redVotes.toLocaleString()}</span>
          <span className="text-battle-blue font-bold">BLUE · {blueVotes.toLocaleString()}</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
          <div className="bg-destructive transition-all duration-700" style={{ width: `${redPct}%` }} />
          <div className="bg-battle-blue transition-all duration-700" style={{ width: `${bluePct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1 font-bold">
          <span className="text-destructive">{redPct}%</span>
          <span className="text-battle-blue">{bluePct}%</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mx-3 mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "VOTES", v: total.toLocaleString() },
          { label: "PEAK LIVE", v: "1.8K" },
          { label: "TIPS", v: "420 CSB", gold: true },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-secondary p-2 text-center">
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
            <p className={`font-display text-lg ${s.gold ? "text-accent" : ""}`}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">EARNED THIS ROUND</p>
      <div className="mx-3 mt-2 space-y-1.5">
        {[
          { Icon: Trophy, label: "Battle Won", sub: "+150 XP", color: "text-accent bg-accent/15" },
          { Icon: Crown, label: "Crowd Favorite", sub: "60%+ of votes", color: "text-primary bg-primary/15" },
        ].map((a) => (
          <div key={a.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border">
            <div className={`h-9 w-9 rounded-full grid place-items-center ${a.color}`}>
              <a.Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onRematch}
        className="mx-3 mt-4 w-[calc(100%-1.5rem)] py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-lg flex items-center justify-center gap-2 glow-primary active:scale-95 transition-transform"
      >
        <RotateCcw className="h-5 w-5" /> REMATCH
      </button>
    </div>
  );
};

export default BattleResultsScreen;
