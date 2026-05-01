import { Menu, Smartphone, Users2, Shuffle } from "lucide-react";

const tabs = ["Open Collabs", "My Collabs", "Invites"];
const collabs = [
  { name: "HARD TIMES", by: "BeatKing", joined: "2/5" },
  { name: "NO SLEEP", by: "Lil Prophet", joined: "3/4" },
  { name: "NEXT LEVEL", by: "StarBeats", joined: "1/4" },
];

const CollabScreen = () => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button className="h-9 w-9 grid place-items-center rounded-full bg-secondary"><Menu className="h-5 w-5" /></button>
      <p className="font-display tracking-widest text-sm">NEW COLLAB</p>
      <div className="h-9 w-9" />
    </div>

    <div className="grid grid-cols-3 gap-2 mx-3">
      {tabs.map((t, i) => (
        <button
          key={t}
          className={`py-2 rounded-lg text-[11px] font-bold ${
            i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {t.toUpperCase()}
        </button>
      ))}
    </div>

    <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">START A COLLAB</p>
    <div className="grid grid-cols-3 gap-2 mx-3 mt-2">
      {[
        { Icon: Smartphone, title: "CREATE TRACK", sub: "Start a track and invite others", color: "text-primary border-primary/40 bg-primary/10" },
        { Icon: Users2, title: "JOIN OPEN COLLAB", sub: "Find tracks to jump on", color: "text-battle-blue border-battle-blue/40 bg-battle-blue/10" },
        { Icon: Shuffle, title: "RANDOM MATCH", sub: "We'll match you to create", color: "text-accent border-accent/40 bg-accent/10" },
      ].map((c) => (
        <button key={c.title} className={`p-2 rounded-xl border text-left ${c.color}`}>
          <c.Icon className="h-4 w-4 mb-1.5" />
          <p className="text-[9px] font-bold leading-tight">{c.title}</p>
          <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{c.sub}</p>
        </button>
      ))}
    </div>

    <div className="flex items-center justify-between px-4 mt-5">
      <p className="text-[10px] text-muted-foreground tracking-widest">OPEN COLLABS</p>
      <button className="text-[10px] text-primary font-bold">View All</button>
    </div>

    <div className="space-y-2 mx-3 mt-2">
      {collabs.map((c, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary">
          <div className="h-10 w-10 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, hsl(${i * 80} 80% 50%), hsl(${i * 80 + 40} 80% 30%))` }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">by {c.by} · {c.joined} joined</p>
          </div>
          <button className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">JOIN</button>
        </div>
      ))}
    </div>

    {/* Earnings split slider */}
    <div className="mx-3 mt-4 p-3 rounded-xl bg-card border border-border">
      <p className="text-[10px] text-muted-foreground tracking-widest mb-2">EARNINGS SPLIT</p>
      <div className="relative h-2 rounded-full bg-secondary">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: "60%" }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-background" style={{ left: "calc(60% - 8px)" }} />
      </div>
      <div className="flex justify-between mt-2 text-[10px]">
        <span className="text-primary font-bold">YOU 60%</span>
        <span className="text-accent font-bold">PARTNER 40%</span>
      </div>
    </div>
  </div>
);

export default CollabScreen;
