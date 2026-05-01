import { Dice5, Zap, Bell, Search, Mic, Users, Swords, ShieldOff } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import rapperBlue from "@/assets/rapper-blue.jpg";
import album from "@/assets/album-art.jpg";

const HomeScreen = () => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 stage-bg">
    {/* Status bar */}
    <div className="flex justify-between items-center px-5 pt-3 text-[11px] text-muted-foreground">
      <span>9:31</span>
      <span className="font-display tracking-widest text-foreground">CASH STAGE</span>
      <div className="flex items-center gap-1 bg-secondary rounded-full px-2 py-0.5">
        <span className="text-accent font-bold text-[11px]">2,450</span>
        <span className="text-[9px] text-muted-foreground">CSB</span>
      </div>
    </div>

    {/* Top row */}
    <div className="flex items-center justify-between px-5 pt-3">
      <div>
        <p className="text-xs text-muted-foreground">Welcome back</p>
        <h2 className="font-display text-2xl">King Slammer</h2>
      </div>
      <div className="flex gap-2">
        <button className="h-9 w-9 grid place-items-center rounded-full bg-secondary"><Search className="h-4 w-4" /></button>
        <button className="h-9 w-9 grid place-items-center rounded-full bg-secondary relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </div>

    {/* Hero dice */}
    <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden border border-primary/30 p-6 text-center"
      style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 25% / 0.5), hsl(0 0% 5%) 70%)" }}>
      <div className="absolute inset-0 grid-noise opacity-40" />
      {/* Spotlights */}
      <div className="absolute -top-10 left-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" />
      <div className="absolute -top-10 right-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" style={{ animationDelay: "1s" }} />

      <div className="relative">
        <div className="mx-auto h-24 w-24 grid place-items-center rounded-2xl bg-primary text-primary-foreground glow-primary animate-dice-roll">
          <Dice5 className="h-14 w-14" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl mt-4 text-glow">ROLL THE DICE</h1>
        <p className="text-xs text-muted-foreground mt-1">Solo Drop · Collab · Battle. Anonymous. Random. Real money.</p>
        <button className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform">
          <Zap className="h-4 w-4 fill-current" /> Start Battle
        </button>
      </div>
    </div>

    {/* No-AI badge */}
    <div className="mx-4 mt-3 flex items-center justify-center gap-2 py-2 rounded-full bg-secondary/60 border border-primary/30">
      <ShieldOff className="h-3.5 w-3.5 text-primary" />
      <p className="text-[10px] font-bold tracking-widest text-primary">100% HUMAN · NO AI · RECORDED IN-APP</p>
    </div>

    {/* Three modes */}
    <div className="grid grid-cols-3 gap-2 mx-4 mt-3">
      {[
        { Icon: Mic, label: "SOLO DROP", sub: "Drop a track", color: "text-accent border-accent/40 bg-accent/10" },
        { Icon: Users, label: "COLLAB", sub: "Build together", color: "text-battle-blue border-battle-blue/40 bg-battle-blue/10" },
        { Icon: Swords, label: "BATTLE", sub: "Win the pool", color: "text-primary border-primary/40 bg-primary/10" },
      ].map((m) => (
        <button key={m.label} className={`p-2.5 rounded-xl border text-left ${m.color}`}>
          <m.Icon className="h-4 w-4 mb-1" />
          <p className="text-[10px] font-bold leading-tight">{m.label}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{m.sub}</p>
        </button>
      ))}
    </div>

    {/* Live battles */}
    <div className="px-5 mt-6 flex items-center justify-between">
      <h3 className="font-display text-lg">Live Battles</h3>
      <button className="text-xs text-primary font-semibold">View All</button>
    </div>
    <div className="flex gap-3 px-5 mt-3 overflow-x-auto scrollbar-hide">
      {[
        { name: "Rapper Red", img: rapperRed, plays: "1.2K", live: true },
        { name: "Rapper Blue", img: rapperBlue, plays: "1.5K", live: false },
        { name: "Mic Killa", img: rapperRed, plays: "890", live: true },
      ].map((b, i) => (
        <div key={i} className="shrink-0 w-28 rounded-2xl overflow-hidden bg-secondary relative">
          <img src={b.img} alt={b.name} className="h-32 w-full object-cover" loading="lazy" />
          {b.live && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-destructive text-[9px] font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <div className="p-2">
            <p className="text-xs font-semibold truncate">{b.name}</p>
            <p className="text-[10px] text-muted-foreground">{b.plays} watching</p>
          </div>
        </div>
      ))}
    </div>

    {/* Trending drops */}
    <div className="px-5 mt-6 flex items-center justify-between">
      <h3 className="font-display text-lg">Trending Drops</h3>
      <button className="text-xs text-primary font-semibold">View All</button>
    </div>
    <div className="flex gap-3 px-5 mt-3 overflow-x-auto scrollbar-hide">
      {["Keep Pushin", "Night Bars", "Underground"].map((t, i) => (
        <div key={i} className="shrink-0 w-32">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={album} alt={t} className="h-32 w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <button className="absolute bottom-2 left-2 h-8 w-8 grid place-items-center rounded-full bg-primary text-primary-foreground">
              ▶
            </button>
          </div>
          <p className="text-xs font-semibold mt-2 truncate">{t}</p>
          <p className="text-[10px] text-muted-foreground">12.6K plays</p>
        </div>
      ))}
    </div>
  </div>
);

export default HomeScreen;
