import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, Swords, Music, Users, Wallet, Mic, Play, Pause, Loader2,
  LogOut, Dice5, ShieldOff, Headphones, Trophy, Flame, RefreshCw, Star, Gavel,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { gateAd, type Tier } from "@/components/AdGate";
import { useJudging } from "@/components/JudgingTimer";

type Tab = "home" | "feed" | "studio" | "leaderboard" | "wallet";
type Mode = "solo" | "collab" | "battle";

interface FeedTrack {
  id: string;
  title: string;
  mode: Mode;
  audio_path: string;
  duration_seconds: number;
  play_count: number;
  created_at: string;
  user_id: string;
  audio_url: string;
  artist_name?: string;
  is_featured?: boolean;
}

interface Profile {
  id: string;
  artist_name: string;
  avatar_url: string | null;
}

interface LeaderRow extends Profile {
  total_plays: number;
  track_count: number;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const modeBadge: Record<Mode, string> = {
  solo: "text-accent border-accent/40 bg-accent/10",
  collab: "text-battle-blue border-battle-blue/40 bg-battle-blue/10",
  battle: "text-primary border-primary/40 bg-primary/10",
};

const ModeIcon: Record<Mode, typeof Mic> = {
  solo: Music, collab: Users, battle: Swords,
};

const LiveApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const judging = useJudging();
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [feed, setFeed] = useState<FeedTrack[]>([]);
  const [featured, setFeatured] = useState<FeedTrack[]>([]);
  const [myTracks, setMyTracks] = useState<FeedTrack[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tier, setTier] = useState<Tier>("free");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const loadAll = async () => {
    if (!user) return;
    setRefreshing(true);
    const [{ data: prof }, { data: wal }, { data: tracks }, { data: mine }, { data: feat }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("id, artist_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("csb_balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("tracks")
        .select("id, title, mode, audio_path, duration_seconds, play_count, created_at, user_id, is_featured")
        .order("play_count", { ascending: false })
        .limit(50),
      supabase.from("tracks")
        .select("id, title, mode, audio_path, duration_seconds, play_count, created_at, user_id, is_featured")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("tracks")
        .select("id, title, mode, audio_path, duration_seconds, play_count, created_at, user_id, is_featured")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("subscriptions").select("tier").eq("user_id", user.id).maybeSingle(),
    ]);

    setProfile(prof ?? null);
    setBalance(wal?.csb_balance ?? 0);
    setTier(((sub?.tier as Tier) ?? "free"));

    // Build artist name lookup
    const ids = Array.from(new Set((tracks ?? []).map((t) => t.user_id)));
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, artist_name")
        .in("id", ids);
      nameMap = new Map((profs ?? []).map((p) => [p.id, p.artist_name]));
    }

    const allPaths = [...(tracks ?? []), ...(mine ?? []), ...(feat ?? [])].map((t: any) => t.audio_path);
    const { signedTrackUrls } = await import("@/lib/storage");
    const urlMap = await signedTrackUrls(allPaths);

    const decorate = (rows: any[]): FeedTrack[] =>
      (rows ?? []).map((t) => ({
        ...t,
        mode: t.mode as Mode,
        audio_url: urlMap.get(t.audio_path) ?? "",
        artist_name: nameMap.get(t.user_id),
      }));

    setFeed(decorate(tracks ?? []));
    setMyTracks(decorate(mine ?? []));
    setFeatured(decorate(feat ?? []));

    // Compute leaderboard from feed (top artists by total plays)
    const agg = new Map<string, { plays: number; count: number }>();
    (tracks ?? []).forEach((t: any) => {
      const cur = agg.get(t.user_id) ?? { plays: 0, count: 0 };
      cur.plays += t.play_count ?? 0;
      cur.count += 1;
      agg.set(t.user_id, cur);
    });
    const board: LeaderRow[] = Array.from(agg.entries())
      .map(([id, v]) => ({
        id,
        artist_name: nameMap.get(id) ?? "Unknown Artist",
        avatar_url: null,
        total_plays: v.plays,
        track_count: v.count,
      }))
      .sort((a, b) => b.total_plays - a.total_plays)
      .slice(0, 25);
    setLeaders(board);

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: refresh wallet & tracks when changes happen
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("liveapp")
      .on("postgres_changes", { event: "*", schema: "public", table: "tracks" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handlePlay = async (track: FeedTrack) => {
    if (playingId === track.id) {
      setPlayingId(null);
      return;
    }
    // Free users watch a 30s ad before each track play (skips own tracks)
    if (track.user_id !== user?.id) {
      try { await gateAd(tier); } catch { /* ignore */ }
    }
    setPlayingId(track.id);
    if (track.user_id !== user?.id) {
      const { error } = await supabase.rpc("increment_play_count", { _track_id: track.id });
      if (!error) {
        setFeed((cur) => cur.map((t) => t.id === track.id ? { ...t, play_count: t.play_count + 1 } : t));
      }
    }
  };

  const rollTheDice = () => {
    const modes: Mode[] = ["solo", "collab", "battle"];
    const pick = modes[Math.floor(Math.random() * modes.length)];
    toast.success(`🎲 Rolled: ${pick.toUpperCase()} — head to the studio.`);
    navigate("/studio");
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night bars";
    if (h < 12) return "Good morning";
    if (h < 18) return "Welcome back";
    return "Stage is hot";
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center stage-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 stage-bg">
      <SiteNav />
      <div className="container max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{greeting}</p>
            <h1 className="font-display text-3xl">{profile?.artist_name ?? "Artist"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={refreshing}
              className="h-10 w-10 grid place-items-center rounded-full bg-secondary border border-border hover:border-primary"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleSignOut}
              className="h-10 w-10 grid place-items-center rounded-full bg-secondary border border-border hover:border-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Wallet pill */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-accent/40">
          <Wallet className="h-3.5 w-3.5 text-accent" />
          <span className="font-display text-sm text-accent">{balance.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground tracking-widest">CSB</span>
        </div>

        {/* Tabs (segmented) */}
        <div className="mt-6 grid grid-cols-5 gap-1 p-1 rounded-2xl bg-card border border-border text-[10px] font-bold tracking-wider">
          {([
            { id: "home", label: "HOME", Icon: Home },
            { id: "feed", label: "FEED", Icon: Flame },
            { id: "studio", label: "STUDIO", Icon: Mic },
            { id: "leaderboard", label: "TOP", Icon: Trophy },
            { id: "wallet", label: "WALLET", Icon: Wallet },
          ] as { id: Tab; label: string; Icon: typeof Home }[]).map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                  active ? "bg-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="mt-6">
          {tab === "home" && (
            <HomeTab
              balance={balance}
              myCount={myTracks.length}
              feedCount={feed.length}
              onRoll={rollTheDice}
              onGoStudio={() => navigate("/studio")}
            />
          )}
          {tab === "home" && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button onClick={() => navigate("/weekly")} className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left hover:border-primary">
                <p className="text-[10px] tracking-widest text-primary font-bold">WEEKLY CONTEST</p>
                <p className="font-display text-lg mt-1">$500 PRIZE</p>
              </button>
              <button onClick={() => navigate("/beat-of-the-day")} className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-left hover:border-accent">
                <p className="text-[10px] tracking-widest text-accent font-bold">BEAT OF THE DAY</p>
                <p className="font-display text-lg mt-1">VOTE NOW</p>
              </button>
              <button onClick={() => navigate("/crews")} className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary">
                <p className="text-[10px] tracking-widest text-muted-foreground font-bold">CREWS</p>
                <p className="font-display text-lg mt-1">JOIN ONE</p>
              </button>
              <button onClick={() => navigate("/chat")} className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary">
                <p className="text-[10px] tracking-widest text-muted-foreground font-bold">CHAT</p>
                <p className="font-display text-lg mt-1">OPEN ROOMS</p>
              </button>
              <button onClick={() => judging.open()} className="rounded-2xl border border-accent/40 bg-accent/5 p-4 text-left hover:border-accent">
                <p className="text-[10px] tracking-widest text-accent font-bold flex items-center gap-1"><Gavel className="h-3 w-3" /> JUDGE NOW</p>
                <p className="font-display text-lg mt-1">10 MIN · ANON</p>
              </button>
              <button onClick={() => navigate("/boosts")} className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left hover:border-primary">
                <p className="text-[10px] tracking-widest text-primary font-bold flex items-center gap-1"><Star className="h-3 w-3" /> BOOST TRACK</p>
                <p className="font-display text-lg mt-1">$4.99 · $8.99</p>
              </button>
              <button onClick={() => navigate("/judging")} className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary col-span-2">
                <p className="text-[10px] tracking-widest text-muted-foreground font-bold flex items-center gap-1"><Gavel className="h-3 w-3" /> JUDGING SESSIONS</p>
                <p className="font-display text-lg mt-1">INVITE-ONLY PANELS</p>
              </button>
            </div>
          )}
          {tab === "feed" && (
            <FeedTab tracks={feed} featured={featured} playingId={playingId} onPlay={handlePlay} />
          )}
          {tab === "studio" && (
            <StudioTab myTracks={myTracks} playingId={playingId} onPlay={handlePlay} onOpenStudio={() => navigate("/studio")} />
          )}
          {tab === "leaderboard" && <LeaderboardTab leaders={leaders} meId={user?.id} />}
          {tab === "wallet" && <WalletTab balance={balance} myTracks={myTracks} />}
        </div>
      </div>
    </div>
  );
};

/* ---------- Tabs ---------- */

const HomeTab = ({
  balance, myCount, feedCount, onRoll, onGoStudio,
}: { balance: number; myCount: number; feedCount: number; onRoll: () => void; onGoStudio: () => void; }) => (
  <div className="space-y-4">
    <div className="relative rounded-3xl overflow-hidden border border-primary/30 p-8 text-center"
      style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 25% / 0.5), hsl(0 0% 5%) 70%)" }}>
      <div className="absolute -top-10 left-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" />
      <div className="absolute -top-10 right-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" style={{ animationDelay: "1s" }} />
      <div className="relative">
        <div className="mx-auto h-20 w-20 grid place-items-center rounded-2xl bg-primary text-primary-foreground glow-primary animate-dice-roll">
          <Dice5 className="h-12 w-12" strokeWidth={2.5} />
        </div>
        <h2 className="font-display text-3xl mt-4 text-glow">ROLL THE DICE</h2>
        <p className="text-xs text-muted-foreground mt-1">Solo · Collab · Battle. Random pick. Real bars.</p>
        <button onClick={onRoll}
          className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform">
          <Dice5 className="h-4 w-4" /> Roll & Record
        </button>
      </div>
    </div>

    <div className="flex items-center justify-center gap-2 py-2 rounded-full bg-secondary/60 border border-primary/30">
      <ShieldOff className="h-3.5 w-3.5 text-primary" />
      <p className="text-[10px] font-bold tracking-widest text-primary">100% HUMAN · NO AI · RECORDED IN-APP</p>
    </div>

    <div className="grid grid-cols-3 gap-3">
      <Stat label="Balance" value={`${balance.toLocaleString()}`} sub="CSB" />
      <Stat label="My Tracks" value={myCount.toString()} sub="dropped" />
      <Stat label="Feed" value={feedCount.toString()} sub="live tracks" />
    </div>

    <button onClick={onGoStudio}
      className="w-full py-4 rounded-2xl bg-secondary border border-primary/30 hover:border-primary font-bold inline-flex items-center justify-center gap-2">
      <Headphones className="h-4 w-4 text-primary" /> Open Full Studio
    </button>
  </div>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="p-4 rounded-2xl bg-card border border-border text-center">
    <p className="text-[9px] tracking-widest text-muted-foreground">{label.toUpperCase()}</p>
    <p className="font-display text-2xl mt-1">{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);

const FeedTab = ({ tracks, featured, playingId, onPlay }: { tracks: FeedTrack[]; featured: FeedTrack[]; playingId: string | null; onPlay: (t: FeedTrack) => void; }) => (
  <div className="space-y-3">
    {featured.length > 0 && (
      <>
        <h2 className="font-display text-2xl flex items-center gap-2"><Star className="h-5 w-5 text-accent" /> Featured Tracks</h2>
        {featured.map((t) => (
          <TrackRow key={`f-${t.id}`} t={t} isPlaying={playingId === t.id} onPlay={() => onPlay(t)} showArtist />
        ))}
      </>
    )}
    <h2 className="font-display text-2xl">🔥 Trending Drops</h2>
    {tracks.length === 0 ? (
      <Empty icon={Flame} title="NO TRACKS YET" sub="Be the first to drop one in the studio." />
    ) : tracks.map((t) => (
      <TrackRow key={t.id} t={t} isPlaying={playingId === t.id} onPlay={() => onPlay(t)} showArtist />
    ))}
  </div>
);

const StudioTab = ({
  myTracks, playingId, onPlay, onOpenStudio,
}: { myTracks: FeedTrack[]; playingId: string | null; onPlay: (t: FeedTrack) => void; onOpenStudio: () => void; }) => (
  <div className="space-y-3">
    <button onClick={onOpenStudio}
      className="w-full p-5 rounded-3xl bg-primary text-primary-foreground font-bold text-lg inline-flex items-center justify-center gap-3 hover:scale-[1.01] transition-transform glow-primary">
      <Mic className="h-5 w-5" /> RECORD A NEW DROP
    </button>
    <h2 className="font-display text-2xl mt-4">My Catalog</h2>
    {myTracks.length === 0 ? (
      <Empty icon={Mic} title="NO BARS YET" sub="Hit Record above to drop your first track." />
    ) : myTracks.map((t) => (
      <TrackRow key={t.id} t={t} isPlaying={playingId === t.id} onPlay={() => onPlay(t)} />
    ))}
  </div>
);

const LeaderboardTab = ({ leaders, meId }: { leaders: LeaderRow[]; meId?: string }) => (
  <div className="space-y-2">
    <h2 className="font-display text-2xl">🏆 Top Artists</h2>
    {leaders.length === 0 ? (
      <Empty icon={Trophy} title="NO RANKINGS YET" sub="Tracks need plays before the board lights up." />
    ) : leaders.map((row, i) => (
      <div key={row.id}
        className={`flex items-center gap-3 p-3 rounded-2xl border ${
          row.id === meId ? "bg-primary/10 border-primary/40" : "bg-card border-border"
        }`}>
        <div className={`h-10 w-10 grid place-items-center rounded-full font-display text-lg ${
          i === 0 ? "bg-accent text-accent-foreground" :
          i === 1 ? "bg-secondary text-foreground" :
          i === 2 ? "bg-primary/30 text-primary" :
          "bg-secondary text-muted-foreground"
        }`}>
          {i + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.artist_name}{row.id === meId && " (you)"}</p>
          <p className="text-[10px] text-muted-foreground tracking-widest">
            {row.track_count} TRACKS · {row.total_plays.toLocaleString()} PLAYS
          </p>
        </div>
        {i < 3 && <Trophy className={`h-4 w-4 ${i === 0 ? "text-accent" : i === 1 ? "text-foreground" : "text-primary"}`} />}
      </div>
    ))}
  </div>
);

const WalletTab = ({ balance, myTracks }: { balance: number; myTracks: FeedTrack[] }) => {
  const totalPlays = myTracks.reduce((s, t) => s + t.play_count, 0);
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-3xl text-center relative overflow-hidden border border-border"
        style={{ background: "radial-gradient(ellipse at top, hsl(45 100% 25% / 0.4), hsl(0 0% 6%) 70%)" }}>
        <p className="text-[10px] text-muted-foreground tracking-widest">BALANCE</p>
        <p className="font-display text-5xl text-accent text-glow-gold mt-1">
          {balance.toLocaleString()} <span className="text-2xl text-muted-foreground">CSB</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-2">Earnings update in real time as your tracks get plays.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="My Tracks" value={myTracks.length.toString()} sub="dropped" />
        <Stat label="Total Plays" value={totalPlays.toLocaleString()} sub="all time" />
      </div>

      <div className="p-4 rounded-2xl bg-card border border-border">
        <p className="text-[10px] tracking-widest text-muted-foreground">DEPOSITS & WITHDRAWALS</p>
        <p className="text-sm mt-1">Coming soon — payouts via Stripe & PayPal.</p>
      </div>
    </div>
  );
};

const TrackRow = ({
  t, isPlaying, onPlay, showArtist,
}: { t: FeedTrack; isPlaying: boolean; onPlay: () => void; showArtist?: boolean; }) => {
  const Icon = ModeIcon[t.mode];
  return (
    <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 grid place-items-center rounded-xl border ${modeBadge[t.mode]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{t.title}</p>
          <p className="text-[10px] text-muted-foreground tracking-widest truncate">
            {showArtist && t.artist_name ? `${t.artist_name.toUpperCase()} · ` : ""}
            {t.mode.toUpperCase()} · {formatTime(t.duration_seconds)} · {t.play_count.toLocaleString()} PLAYS
          </p>
        </div>
        <button
          onClick={onPlay}
          className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
      </div>
      {isPlaying && (
        <audio src={t.audio_url} controls autoPlay className="w-full mt-3" />
      )}
    </div>
  );
};

const Empty = ({ icon: Icon, title, sub }: { icon: typeof Mic; title: string; sub: string }) => (
  <div className="text-center py-12 rounded-2xl border border-dashed border-border">
    <Icon className="h-10 w-10 mx-auto text-muted-foreground" />
    <p className="font-display text-xl mt-3">{title}</p>
    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
  </div>
);

export default LiveApp;
