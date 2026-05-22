import { ChevronLeft, Flame, Play, Pause, Coins, Zap } from "lucide-react";
import album from "@/assets/album-art.jpg";

export interface SoloDropScreenProps {
  title?: string;
  artist?: string;
  explicit?: boolean;
  heatPercent?: number;
  plays?: string;
  likes?: string;
  tips?: string;
  commentCount?: number;
  artworkUrl?: string;
  playing?: boolean;
  onBack?: () => void;
  onPlay?: () => void;
  onTip?: () => void;
  onBoost?: () => void;
  onComments?: () => void;
}

const SoloDropScreen = ({
  title = "KEEP PUSHIN",
  artist = "Young Legend",
  explicit = true,
  heatPercent = 87,
  plays = "12.6K",
  likes = "2.3K",
  tips = "850 CSB",
  commentCount = 128,
  artworkUrl,
  playing = false,
  onBack,
  onPlay,
  onTip,
  onBoost,
  onComments,
}: SoloDropScreenProps = {}) => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary active:scale-95 transition-transform">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="font-display tracking-widest text-sm">DROP DETAILS</p>
      <div className="h-9 w-9" />
    </div>

    <div className="relative mx-3 rounded-2xl overflow-hidden">
      <img src={artworkUrl ?? album} alt={title} className="w-full aspect-square object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background via-background/80 to-transparent">
        <p className="font-display text-2xl text-glow">{title}</p>
        <p className="text-xs text-muted-foreground">{artist}</p>
      </div>
      {explicit && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-background/80 text-[10px] font-bold border border-border">EXPLICIT</span>
      )}
    </div>

    {/* Heat meter */}
    <div className="mx-3 mt-3 rounded-xl bg-card border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold flex items-center gap-1"><Flame className="h-4 w-4 text-accent" /> HEAT METER</p>
        <p className="text-xs font-bold text-accent">{Math.round(heatPercent)}%</p>
      </div>
      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, heatPercent))}%`,
            background: "linear-gradient(90deg, hsl(45 100% 60%), hsl(15 100% 55%))",
            boxShadow: "0 0 12px hsl(45 100% 60% / 0.7)",
          }}
        />
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-2 mx-3 mt-3">
      {[
        { label: "PLAYS", v: plays, gold: false },
        { label: "LIKES", v: likes, gold: false },
        { label: "TIPS", v: tips, gold: true },
      ].map((s) => (
        <div key={s.label} className="rounded-xl bg-secondary p-2 text-center">
          <p className="text-[9px] text-muted-foreground">{s.label}</p>
          <p className={`font-display text-lg ${s.gold ? "text-accent" : ""}`}>{s.v}</p>
        </div>
      ))}
    </div>

    {/* Play */}
    <button
      onClick={onPlay}
      className="mx-3 mt-3 w-[calc(100%-1.5rem)] py-3.5 rounded-xl bg-primary text-primary-foreground font-display text-lg flex items-center justify-center gap-2 glow-primary active:scale-95 transition-transform"
    >
      {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
      {playing ? "PAUSE" : "PLAY SONG"}
    </button>

    {/* Tip + boost */}
    <div className="grid grid-cols-2 gap-3 mx-3 mt-3">
      <button
        onClick={onTip}
        className="py-3 rounded-xl bg-accent/15 border border-accent/40 text-accent font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Coins className="h-4 w-4" /> Tip Artist
      </button>
      <button
        onClick={onBoost}
        className="py-3 rounded-xl bg-secondary border border-border font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Zap className="h-4 w-4 text-primary fill-primary" /> Boost Track
      </button>
    </div>

    <button
      onClick={onComments}
      className="mx-3 mt-3 w-[calc(100%-1.5rem)] py-3 rounded-xl bg-secondary text-left px-4 flex items-center justify-between text-sm active:scale-95 transition-transform"
    >
      <span>Comments ({commentCount.toLocaleString()})</span>
      <span className="text-muted-foreground">›</span>
    </button>
  </div>
);

export default SoloDropScreen;
