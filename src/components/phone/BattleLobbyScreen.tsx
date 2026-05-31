import { ChevronLeft, Users, Clock, Lock, Swords, Zap } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import rapperBlue from "@/assets/rapper-blue.jpg";

export interface BattleLobbyScreenProps {
  matchingSeconds?: number;
  entryCsb?: number;
  poolCsb?: number;
  onBack?: () => void;
  onCancel?: () => void;
}

const BattleLobbyScreen = ({
  matchingSeconds = 14,
  entryCsb = 100,
  poolCsb = 1250,
  onBack,
  onCancel,
}: BattleLobbyScreenProps = {}) => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background relative">
    <div className="absolute -top-10 left-1/4 h-48 w-24 bg-destructive/30 blur-3xl animate-spotlight" />
    <div className="absolute -top-10 right-1/4 h-48 w-24 bg-battle-blue/30 blur-3xl animate-spotlight" style={{ animationDelay: "0.7s" }} />

    <div className="relative flex items-center justify-between px-4 pt-4 pb-2">
      <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="font-display tracking-widest text-sm">MATCHMAKING</p>
      <div className="h-9 w-9" />
    </div>

    <div className="relative mx-3 mt-4 rounded-3xl border border-primary/30 p-5 text-center"
      style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 18% / 0.5), hsl(0 0% 5%) 70%)" }}>
      <div className="mx-auto h-20 w-20 grid place-items-center rounded-full bg-primary/20 border-2 border-primary glow-primary">
        <Swords className="h-9 w-9 text-primary animate-pulse" />
      </div>
      <p className="font-display text-2xl mt-3 text-glow">FINDING OPPONENT</p>
      <p className="text-[10px] text-muted-foreground tracking-widest mt-1">ANONYMOUS · RANDOM · FAIR</p>

      <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary">
        <Clock className="h-3 w-3 text-accent" />
        <span className="text-[11px] font-bold tabular-nums">0:{String(matchingSeconds).padStart(2, "0")}</span>
      </div>
    </div>

    {/* Diagonal vs */}
    <div className="relative mx-3 mt-4 h-44 rounded-2xl overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-battle)" }} />
      <img src={rapperRed} alt="" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40" />

      <div className="absolute top-3 left-3">
        <p className="text-[10px] text-destructive font-bold">YOU</p>
        <p className="font-display text-lg leading-none">RAPPER RED</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">RANK · ELITE</p>
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div className="h-16 w-16 rounded-full bg-background/80 backdrop-blur grid place-items-center border border-border">
          <span className="font-display text-2xl text-glow text-primary">VS</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-right">
        <p className="text-[10px] text-battle-blue font-bold flex items-center gap-1 justify-end">
          <Lock className="h-2.5 w-2.5" /> HIDDEN
        </p>
        <p className="font-display text-lg leading-none">???</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">REVEALED AT START</p>
      </div>
    </div>

    {/* Stake */}
    <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-card border border-border p-3 text-center">
        <p className="text-[9px] text-muted-foreground tracking-widest">ENTRY</p>
        <p className="font-display text-2xl">{entryCsb} <span className="text-xs text-muted-foreground">CSB</span></p>
      </div>
      <div className="rounded-xl bg-accent/10 border border-accent/40 p-3 text-center">
        <p className="text-[9px] text-accent tracking-widest">PRIZE POOL</p>
        <p className="font-display text-2xl text-accent text-glow-gold">{poolCsb.toLocaleString()}</p>
      </div>
    </div>

    {/* Players waiting */}
    <div className="mx-3 mt-3 p-3 rounded-xl bg-secondary flex items-center gap-3">
      <div className="flex -space-x-2">
        <img src={rapperRed} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-background" loading="lazy" />
        <img src={rapperBlue} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-background" loading="lazy" />
        <div className="h-7 w-7 rounded-full bg-background grid place-items-center text-[9px] font-bold ring-2 ring-background">+8</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold flex items-center gap-1"><Users className="h-3 w-3" /> 10 in queue</p>
        <p className="text-[10px] text-muted-foreground">Avg wait · 18s</p>
      </div>
      <Zap className="h-4 w-4 text-primary fill-primary animate-pulse" />
    </div>

    <button
      onClick={onCancel}
      className="mx-3 mt-3 w-[calc(100%-1.5rem)] py-3 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive font-bold text-xs tracking-widest active:scale-95 transition-transform"
    >
      CANCEL MATCH
    </button>
  </div>
);

export default BattleLobbyScreen;
