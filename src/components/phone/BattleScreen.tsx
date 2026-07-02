import { useState } from "react";
import { ChevronLeft, MessageCircle, Zap, Play, Pause } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";

export interface BattleScreenProps {
  endsIn?: string;
  redName?: string;
  blueName?: string;
  redRank?: string;
  blueRank?: string;
  redDuration?: string;
  blueDuration?: string;
  prizePoolCsb?: number;
  voted?: "red" | "blue" | null;
  playingSide?: "red" | "blue" | null;
  onBack?: () => void;
  onPlayVerse?: (side: "red" | "blue") => void;
  onBoostPool?: () => void;
  onVote?: (side: "red" | "blue") => void;
  onOpenChat?: () => void;
}

const Wave = ({ color, active }: { color: string; active?: boolean }) => (
  <div className="flex items-end gap-0.5 h-8">
    {Array.from({ length: 22 }).map((_, i) => (
      <span
        key={i}
        className={`w-1 rounded-full ${active ? "animate-wave" : ""}`}
        style={{
          background: color,
          height: `${30 + Math.sin(i) * 30 + 30}%`,
          animationDelay: `${i * 0.06}s`,
        }}
      />
    ))}
  </div>
);

const BattleScreen = ({
  endsIn = "23:45:12",
  redName = "Rapper Red",
  blueName = "Rapper Blue",
  redRank = "ELITE",
  blueRank = "ELITE",
  redDuration = "01:45",
  blueDuration = "01:42",
  prizePoolCsb = 1250,
  voted: votedProp,
  playingSide,
  onBack,
  onPlayVerse,
  onBoostPool,
  onVote,
  onOpenChat,
}: BattleScreenProps = {}) => {
  const [localVoted, setLocalVoted] = useState<"red" | "blue" | null>(null);
  const voted = votedProp !== undefined ? votedProp : localVoted;

  const handleVote = (side: "red" | "blue") => {
    if (voted) return;
    if (onVote) onVote(side);
    else setLocalVoted(side);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">BATTLE ENDS IN</p>
          <p className="font-display text-lg text-accent text-glow-gold">{endsIn}</p>
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* Diagonal split */}
      <div className="relative mx-3 h-56 rounded-2xl overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-battle)" }} />
        <img src={rapperRed} alt="" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="font-display text-5xl text-glow text-primary -rotate-6">VS</div>
        </div>
        <div className="absolute top-3 left-3">
          <p className="font-display text-lg leading-none">{redName}</p>
          <p className="text-[10px] text-destructive font-bold">RANK: {redRank}</p>
        </div>
        <div className="absolute bottom-3 right-3 text-right">
          <p className="font-display text-lg leading-none">{blueName}</p>
          <p className="text-[10px] text-battle-blue font-bold">RANK: {blueRank}</p>
        </div>
      </div>

      {/* Verses */}
      <div className="grid grid-cols-2 gap-3 px-3 mt-3">
        <button
          onClick={() => onPlayVerse?.("red")}
          className="rounded-2xl bg-secondary p-3 border border-destructive/30 text-left active:scale-95 transition-transform"
        >
          <p className="text-[10px] font-bold text-destructive flex items-center gap-1">
            {playingSide === "red" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            PLAY VERSE
          </p>
          <Wave color="hsl(var(--battle-red))" active={playingSide === "red"} />
          <p className="text-[10px] text-muted-foreground mt-1">{redDuration}</p>
        </button>
        <button
          onClick={() => onPlayVerse?.("blue")}
          className="rounded-2xl bg-secondary p-3 border border-battle-blue/30 text-left active:scale-95 transition-transform"
        >
          <p className="text-[10px] font-bold text-battle-blue flex items-center gap-1">
            {playingSide === "blue" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
            PLAY VERSE
          </p>
          <Wave color="hsl(var(--battle-blue))" active={playingSide === "blue"} />
          <p className="text-[10px] text-muted-foreground mt-1">{blueDuration}</p>
        </button>
      </div>

      {/* Prize pool */}
      <div className="mx-3 mt-3 rounded-2xl bg-card border border-border p-3 text-center">
        <p className="text-[10px] text-muted-foreground">PRIZE POOL</p>
        <p className="font-display text-3xl text-accent text-glow-gold">{prizePoolCsb.toLocaleString()} CSB</p>
        <button
          onClick={onBoostPool}
          className="mt-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Zap className="h-3 w-3 fill-current" /> Boost Prize Pool
        </button>
      </div>

      {/* Vote */}
      <div className="px-3 mt-3">
        <p className="text-center text-[10px] text-muted-foreground tracking-widest">VOTE FOR THE BEST VERSE</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            disabled={!!voted}
            onClick={() => handleVote("red")}
            className={`py-3 rounded-xl font-display text-lg transition-all ${
              voted === "red"
                ? "bg-destructive text-white scale-95"
                : voted ? "bg-secondary text-muted-foreground" : "bg-destructive/90 text-white pulse-ring hover:scale-105 active:scale-95"
            }`}
          >
            VOTE RED
          </button>
          <button
            disabled={!!voted}
            onClick={() => handleVote("blue")}
            className={`py-3 rounded-xl font-display text-lg transition-all ${
              voted === "blue"
                ? "bg-battle-blue text-white scale-95"
                : voted ? "bg-secondary text-muted-foreground" : "bg-battle-blue/90 text-white pulse-ring hover:scale-105 active:scale-95"
            }`}
          >
            VOTE BLUE
          </button>
        </div>
        {voted && <p className="text-center text-[10px] text-primary mt-2 font-semibold">🔒 Vote locked. Anonymous. Anti-cheat engaged.</p>}
      </div>

      {/* Live chat */}
      <button
        onClick={onOpenChat}
        className="mx-3 mt-3 w-[calc(100%-1.5rem)] py-3 rounded-xl bg-secondary border border-border flex items-center justify-center gap-2 text-sm font-semibold active:scale-95 transition-transform"
      >
        <MessageCircle className="h-4 w-4" /> Live Chat
      </button>

      {/* House rules */}
      <div className="mx-3 mt-3 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2">
        <p className="text-[10px] font-bold text-primary">18+ · Drama stays in the battle</p>
        <p className="text-[9px] text-muted-foreground leading-snug">
          No racism · No personal threats · Bars only. Break the rules → permanent ban.
        </p>
      </div>
    </div>
  );
};

export default BattleScreen;
