import { Settings, Share2, Trophy, Flame, Mic, Users, Play, Crown } from "lucide-react";
import rapperRed from "@/assets/rapper-red.jpg";
import album from "@/assets/album-art.jpg";

export interface ProfileScreenProps {
  name?: string;
  handle?: string;
  bio?: string;
  followers?: string;
  following?: string;
  tier?: "RISING" | "ELITE" | "LEGEND";
  onSettings?: () => void;
  onShare?: () => void;
}

const drops = [
  { id: "d1", title: "Keep Pushin", plays: "12.6K" },
  { id: "d2", title: "Night Bars", plays: "8.4K" },
  { id: "d3", title: "Underground", plays: "5.1K" },
  { id: "d4", title: "404 Heat", plays: "3.9K" },
];

const badges = [
  { Icon: Trophy, label: "Weekly Winner", color: "text-accent bg-accent/15 border-accent/40" },
  { Icon: Flame, label: "7-Day Streak", color: "text-primary bg-primary/15 border-primary/40" },
  { Icon: Crown, label: "Top 10", color: "text-accent bg-accent/15 border-accent/40" },
  { Icon: Mic, label: "100 Drops", color: "text-foreground bg-secondary border-border" },
];

const ProfileScreen = ({
  name = "King Slammer",
  handle = "@kingslammer",
  bio = "Bama bars. Real recordings. No AI. CSB chaser.",
  followers = "12.4K",
  following = "284",
  tier = "ELITE",
  onSettings,
  onShare,
}: ProfileScreenProps = {}) => (
  <div className="h-full overflow-y-auto scrollbar-hide pb-24 bg-background">
    {/* Cover */}
    <div className="relative h-28 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "var(--gradient-stage)" }} />
      <div className="absolute -top-4 left-1/4 h-32 w-20 bg-primary/30 blur-2xl animate-spotlight" />
      <div className="absolute -top-4 right-1/4 h-32 w-20 bg-accent/30 blur-2xl animate-spotlight" style={{ animationDelay: "0.8s" }} />
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={onShare} aria-label="Share" className="h-8 w-8 grid place-items-center rounded-full bg-background/70 backdrop-blur active:scale-95 transition-transform">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={onSettings} aria-label="Settings" className="h-8 w-8 grid place-items-center rounded-full bg-background/70 backdrop-blur active:scale-95 transition-transform">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>

    {/* Avatar */}
    <div className="px-4 -mt-10 flex items-end gap-3">
      <img src={rapperRed} alt={name} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-background" loading="lazy" />
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-1.5">
          <p className="font-display text-xl truncate">{name}</p>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/20 text-accent border border-accent/40">{tier}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{handle}</p>
      </div>
    </div>

    <p className="px-4 mt-2 text-xs text-foreground/90 leading-snug">{bio}</p>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-2 mx-3 mt-3">
      <div className="rounded-xl bg-secondary p-2 text-center">
        <p className="font-display text-lg">{followers}</p>
        <p className="text-[9px] text-muted-foreground">FOLLOWERS</p>
      </div>
      <div className="rounded-xl bg-secondary p-2 text-center">
        <p className="font-display text-lg">{following}</p>
        <p className="text-[9px] text-muted-foreground">FOLLOWING</p>
      </div>
      <div className="rounded-xl bg-accent/15 border border-accent/40 p-2 text-center">
        <p className="font-display text-lg text-accent">42</p>
        <p className="text-[9px] text-accent/80">DROPS</p>
      </div>
    </div>

    {/* Actions */}
    <div className="grid grid-cols-2 gap-2 mx-3 mt-2">
      <button className="py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform">Follow</button>
      <button className="py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
        <Users className="h-3.5 w-3.5" /> Collab
      </button>
    </div>

    {/* Badges */}
    <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">BADGES</p>
    <div className="flex gap-2 px-3 mt-2 overflow-x-auto scrollbar-hide">
      {badges.map((b) => (
        <div key={b.label} className={`shrink-0 px-2.5 py-1.5 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${b.color}`}>
          <b.Icon className="h-3 w-3" /> {b.label}
        </div>
      ))}
    </div>

    {/* Drops grid */}
    <p className="px-4 mt-4 text-[10px] text-muted-foreground tracking-widest">DROPS</p>
    <div className="grid grid-cols-2 gap-2 mx-3 mt-2">
      {drops.map((d) => (
        <div key={d.id} className="relative rounded-xl overflow-hidden">
          <img src={album} alt={d.title} className="w-full aspect-square object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent" />
          <button aria-label={`Play ${d.title}`} className="absolute bottom-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform">
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>
          <div className="absolute bottom-1.5 left-1.5">
            <p className="text-[10px] font-bold leading-tight">{d.title}</p>
            <p className="text-[9px] text-muted-foreground">{d.plays}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ProfileScreen;
