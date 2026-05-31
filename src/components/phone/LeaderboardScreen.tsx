import { Trophy, Flame, Crown, ChevronLeft } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import rapperBlue from "@/assets/rapper-blue.jpg";

type Range = "day" | "week" | "all";

export interface LeaderboardScreenProps {
  range?: Range;
  onRangeChange?: (r: Range) => void;
  onBack?: () => void;
}

const ranks = [
  { rank: 1, name: "King Slammer", crew: "Bama Slammers", csb: 18420, img: rapperRed, streak: 7 },
  { rank: 2, name: "Lil Prophet", crew: "Night Crew", csb: 14210, img: rapperBlue, streak: 4 },
  { rank: 3, name: "Mic Killa", crew: "404 Heat", csb: 11980, img: rapperRed, streak: 3 },
  { rank: 4, name: "Young Legend", crew: "Solo", csb: 9460, img: rapperBlue, streak: 2 },
  { rank: 5, name: "BeatKing", crew: "StarBeats", csb: 8120, img: rapperRed, streak: 1 },
  { rank: 6, name: "Nova", crew: "Solo", csb: 7250, img: rapperBlue, streak: 1 },
];

const RANGES: { id: Range; label: string }[] = [
  { id: "day", label: "TODAY" },
  { id: "week", label: "THIS WEEK" },
  { id: "all", label: "ALL TIME" },
];

const LeaderboardScreen = ({ range = "week", onRangeChange, onBack }: LeaderboardScreenProps = {}) => {
  const podium = ranks.slice(0, 3);
  return (
    <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-display tracking-widest text-sm flex items-center gap-1.5"><Trophy className="h-4 w-4 text-accent" /> LEADERBOARD</p>
        <div className="h-9 w-9" />
      </div>

      <div className="grid grid-cols-3 gap-2 mx-3 mt-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => onRangeChange?.(r.id)}
            className={`py-2 rounded-lg text-[10px] font-bold transition-colors ${
              range === r.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      <div className="mx-3 mt-4 grid grid-cols-3 gap-2 items-end">
        {[podium[1], podium[0], podium[2]].map((p, i) => {
          const heights = ["h-16", "h-24", "h-12"];
          const colors = ["bg-secondary", "bg-accent/30 border border-accent", "bg-secondary"];
          const real = [2, 1, 3][i];
          return (
            <div key={p.name} className="text-center">
              <div className="relative mx-auto h-12 w-12 rounded-full overflow-hidden border-2" style={{ borderColor: real === 1 ? "hsl(var(--accent))" : "hsl(var(--border))" }}>
                <img src={p.img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                {real === 1 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 h-4 w-4 text-accent fill-accent" />}
              </div>
              <p className="text-[10px] font-bold mt-1 truncate">{p.name}</p>
              <p className="text-[9px] text-accent font-bold">{(p.csb / 1000).toFixed(1)}K</p>
              <div className={`mt-1 rounded-t-lg ${heights[i]} ${colors[i]} grid place-items-center font-display text-lg`}>
                {real}
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div className="mx-3 mt-4 space-y-1.5">
        {ranks.slice(3).map((r) => (
          <div key={r.rank} className="flex items-center gap-3 p-2 rounded-xl bg-secondary">
            <span className="w-5 text-center text-xs text-muted-foreground font-bold">{r.rank}</span>
            <img src={r.img} alt={r.name} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{r.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{r.crew}</p>
            </div>
            {r.streak > 1 && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary font-bold">
                <Flame className="h-3 w-3" /> {r.streak}
              </span>
            )}
            <span className="text-[11px] font-bold text-accent w-12 text-right">{r.csb.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mx-3 mt-4 p-3 rounded-xl bg-card border border-primary/30 flex items-center gap-3">
        <span className="w-5 text-center font-display text-lg text-primary">12</span>
        <div className="h-9 w-9 rounded-full bg-primary/20 grid place-items-center text-xs font-bold text-primary">YOU</div>
        <div className="flex-1">
          <p className="text-xs font-bold">Your Rank</p>
          <p className="text-[10px] text-muted-foreground">Climb 4 more to reach Top 10</p>
        </div>
        <span className="text-[11px] font-bold text-accent">3,210</span>
      </div>
    </div>
  );
};

export default LeaderboardScreen;
