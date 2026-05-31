import { useState } from "react";
import { Mic, Swords, Coins, ShieldOff, Dice5, ChevronRight, Check } from "lucide-react";

export interface OnboardingScreenProps {
  initialStep?: 0 | 1 | 2 | 3;
  onFinish?: () => void;
}

const steps = [
  {
    Icon: Dice5,
    badge: "STEP 1 / 4",
    title: "ROLL THE DICE",
    body: "Solo Drop, Collab, or Battle. Cash Stage picks the energy — you bring the bars.",
    color: "text-primary",
    bg: "from-primary/30 to-background",
  },
  {
    Icon: Mic,
    badge: "STEP 2 / 4",
    title: "100% HUMAN",
    body: "Every bar is recorded in-app. No uploads of AI vocals. No fakes. Just you on the mic.",
    color: "text-accent",
    bg: "from-accent/25 to-background",
  },
  {
    Icon: Swords,
    badge: "STEP 3 / 4",
    title: "BATTLE ANONYMOUS",
    body: "Get matched with a random rapper. Verses drop side by side. The crowd decides.",
    color: "text-destructive",
    bg: "from-destructive/25 to-background",
  },
  {
    Icon: Coins,
    badge: "STEP 4 / 4",
    title: "WIN REAL MONEY",
    body: "Tips, prize pools, and weekly contests pay out in CSB — cash out anytime.",
    color: "text-accent",
    bg: "from-accent/25 to-background",
  },
] as const;

const OnboardingScreen = ({ initialStep = 0, onFinish }: OnboardingScreenProps = {}) => {
  const [i, setI] = useState<number>(initialStep);
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Skip */}
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-[10px] tracking-widest text-muted-foreground">{s.badge}</span>
        <button
          onClick={onFinish}
          className="text-[10px] tracking-widest text-muted-foreground hover:text-foreground"
        >
          SKIP
        </button>
      </div>

      {/* Hero */}
      <div className={`relative mx-4 mt-4 flex-1 rounded-3xl overflow-hidden border border-border bg-gradient-to-b ${s.bg} grid place-items-center p-6 text-center`}>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-current opacity-10 blur-3xl" />
        <div className="absolute -bottom-10 left-1/4 h-32 w-20 bg-primary/20 blur-2xl animate-spotlight" />
        <div className="absolute -bottom-10 right-1/4 h-32 w-20 bg-accent/20 blur-2xl animate-spotlight" style={{ animationDelay: "1s" }} />

        <div className="relative animate-scale-in" key={i}>
          <div className={`mx-auto h-24 w-24 grid place-items-center rounded-3xl bg-background border border-border ${s.color}`}>
            <s.Icon className="h-12 w-12" strokeWidth={2} />
          </div>
          <h1 className="font-display text-3xl mt-5 text-glow">{s.title}</h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-[220px] mx-auto leading-relaxed">{s.body}</p>
        </div>
      </div>

      {/* No-AI badge */}
      <div className="mx-4 mt-3 flex items-center justify-center gap-2 py-2 rounded-full bg-secondary/60 border border-primary/30">
        <ShieldOff className="h-3 w-3 text-primary" />
        <p className="text-[9px] font-bold tracking-widest text-primary">100% HUMAN · NO AI</p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {steps.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`Step ${k + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              k === i ? "w-6 bg-primary" : "w-1.5 bg-secondary"
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-4 pt-3 pb-24">
        <button
          onClick={() => (last ? onFinish?.() : setI(i + 1))}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-lg flex items-center justify-center gap-2 glow-primary active:scale-95 transition-transform"
        >
          {last ? (<><Check className="h-5 w-5" /> ENTER THE STAGE</>) : (<>NEXT <ChevronRight className="h-5 w-5" /></>)}
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
