import { useState } from "react";
import { Menu, Smartphone, Users2, Shuffle } from "lucide-react";

export type CollabTab = "open" | "mine" | "invites";

export interface CollabItem {
  id: string;
  name: string;
  by: string;
  joined: string;
}

export interface CollabScreenProps {
  tab?: CollabTab;
  onTabChange?: (tab: CollabTab) => void;
  items?: CollabItem[];
  splitPercent?: number;
  onSplitChange?: (pct: number) => void;
  onMenu?: () => void;
  onCreateTrack?: () => void;
  onJoinOpen?: () => void;
  onRandomMatch?: () => void;
  onViewAll?: () => void;
  onJoin?: (id: string) => void;
}

const TAB_LABELS: Record<CollabTab, string> = {
  open: "OPEN COLLABS",
  mine: "MY COLLABS",
  invites: "INVITES",
};
const TAB_ORDER: CollabTab[] = ["open", "mine", "invites"];

const defaultCollabs: CollabItem[] = [
  { id: "c1", name: "HARD TIMES", by: "BeatKing", joined: "2/5" },
  { id: "c2", name: "NO SLEEP", by: "Lil Prophet", joined: "3/4" },
  { id: "c3", name: "NEXT LEVEL", by: "StarBeats", joined: "1/4" },
];

const CollabScreen = ({
  tab: tabProp,
  onTabChange,
  items = defaultCollabs,
  splitPercent: splitProp,
  onSplitChange,
  onMenu,
  onCreateTrack,
  onJoinOpen,
  onRandomMatch,
  onViewAll,
  onJoin,
}: CollabScreenProps = {}) => {
  const [localTab, setLocalTab] = useState<CollabTab>("open");
  const tab = tabProp ?? localTab;
  const setTab = (t: CollabTab) => {
    if (onTabChange) onTabChange(t);
    else setLocalTab(t);
  };

  const [localSplit, setLocalSplit] = useState(60);
  const split = splitProp ?? localSplit;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onMenu} aria-label="Menu" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
          <Menu className="h-5 w-5" />
        </button>
        <p className="font-display tracking-widest text-sm">NEW COLLAB</p>
        <div className="h-9 w-9" />
      </div>

      <div className="grid grid-cols-3 gap-2 mx-3">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
              tab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">START A COLLAB</p>
      <div className="grid grid-cols-3 gap-2 mx-3 mt-2">
        {[
          { Icon: Smartphone, title: "CREATE TRACK", sub: "Start a track and invite others", color: "text-primary border-primary/40 bg-primary/10", on: onCreateTrack },
          { Icon: Users2, title: "JOIN OPEN COLLAB", sub: "Find tracks to jump on", color: "text-battle-blue border-battle-blue/40 bg-battle-blue/10", on: onJoinOpen },
          { Icon: Shuffle, title: "RANDOM MATCH", sub: "We'll match you to create", color: "text-accent border-accent/40 bg-accent/10", on: onRandomMatch },
        ].map((c) => (
          <button
            key={c.title}
            onClick={c.on}
            className={`p-2 rounded-xl border text-left active:scale-95 transition-transform ${c.color}`}
          >
            <c.Icon className="h-4 w-4 mb-1.5" />
            <p className="text-[9px] font-bold leading-tight">{c.title}</p>
            <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{c.sub}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 mt-5">
        <p className="text-[10px] text-muted-foreground tracking-widest">{TAB_LABELS[tab]}</p>
        <button onClick={onViewAll} className="text-[10px] text-primary font-bold">View All</button>
      </div>

      <div className="space-y-2 mx-3 mt-2">
        {items.length === 0 ? (
          <p className="text-center text-[11px] text-muted-foreground py-6">No collabs yet.</p>
        ) : (
          items.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary">
              <div className="h-10 w-10 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, hsl(${i * 80} 80% 50%), hsl(${i * 80 + 40} 80% 30%))` }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">by {c.by} · {c.joined} joined</p>
              </div>
              <button
                onClick={() => onJoin?.(c.id)}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
              >
                JOIN
              </button>
            </div>
          ))
        )}
      </div>

      {/* Earnings split slider */}
      <div className="mx-3 mt-4 p-3 rounded-xl bg-card border border-border">
        <p className="text-[10px] text-muted-foreground tracking-widest mb-2">EARNINGS SPLIT</p>
        <input
          type="range"
          min={0}
          max={100}
          value={split}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (onSplitChange) onSplitChange(v);
            else setLocalSplit(v);
          }}
          className="w-full accent-primary"
          aria-label="Earnings split"
        />
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-primary font-bold">YOU {split}%</span>
          <span className="text-accent font-bold">PARTNER {100 - split}%</span>
        </div>
      </div>
    </div>
  );
};

export default CollabScreen;
