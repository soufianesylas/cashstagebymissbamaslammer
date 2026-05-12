import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home, Swords, Music, Users, Wallet, Mic, Play, Pause, Loader2,
  LogOut, Dice5, ShieldOff, Headphones, Trophy, Flame, RefreshCw, Star, Gavel,
  Shield, MessageCircle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import SiteNav from "@/components/SiteNav";
import { ReportTrackButton } from "@/components/ReportTrackButton";
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
  is_boosted?: boolean;
  boost_rank?: number;
}

interface Profile {
  id: string;
  artist_name: string;
  avatar_url: string | null;
}

interface LeaderRow {
  track_id: string;
  title: string;
  artist_name: string;
  score_count: number;
  average_score: number;
  feature_worthy_count: number;
}

interface CrewRow { id: string; name: string; tag: string; member_count: number; }
interface ChatRoomRow { id: string; title: string; kind: string; }

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
  const [crews, setCrews] = useState<CrewRow[]>([]);
  const [rooms, setRooms] = useState<ChatRoomRow[]>([]);
  const [sideLoading, setSideLoading] = useState(true);
  const [weekly, setWeekly] = useState<{ id: string; status: string; prize_usd_cents: number } | null>(null);
  const countedPlayRef = useRef<Set<string>>(new Set());

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const loadAll = async () => {
    if (!user) return;
    setRefreshing(true);
    const trackSelect = "id, title, mode, audio_path, duration_seconds, play_count, created_at, user_id, is_featured";
    const [{ data: prof }, { data: wal }, { data: mine }, { data: feat }, { data: sub }, boostResult, tallyResult] = await Promise.all([
      supabase.from("profiles").select("id, artist_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("csb_balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("tracks").select(trackSelect).eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("tracks").select(trackSelect).eq("is_featured", true).eq("is_hidden", false).order("created_at", { ascending: false }).limit(10),
      supabase.from("subscriptions").select("tier").eq("user_id", user.id).maybeSingle(),
      (supabase as any).rpc("boosted_track_order"),
      (supabase as any).rpc("anonymous_track_score_tallies"),
    ]);

    const boostRows = (boostResult?.data ?? []) as { track_id: string; boost_rank: number }[];
    const boostMap = new Map(boostRows.map((b) => [b.track_id, Number(b.boost_rank) || 0]));
    const boostedIds = boostRows.map((b) => b.track_id);
    const [{ data: boosted }, { data: chronological }] = await Promise.all([
      boostedIds.length ? supabase.from("tracks").select(trackSelect).in("id", boostedIds).eq("is_hidden", false) : Promise.resolve({ data: [] as any[] }),
      supabase.from("tracks").select(trackSelect).eq("is_hidden", false).order("created_at", { ascending: false }).limit(80),
    ]);
    const feedRows = [...(boosted ?? []), ...(chronological ?? []).filter((t: any) => !boostMap.has(t.id))]
      .sort((a: any, b: any) => (boostMap.get(b.id) ?? 0) - (boostMap.get(a.id) ?? 0) || Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 80);

    const tallies = (tallyResult?.data ?? []) as { track_id: string; score_count: number; average_score: number; feature_worthy_count: number }[];
    let tallyTracks: { id: string; title: string; user_id: string }[] = [];
    if (tallies.length) {
      const { data } = await supabase.from("tracks").select("id, title, user_id").in("id", tallies.map((t) => t.track_id));
      tallyTracks = data ?? [];
    }

    setProfile(prof ?? null);
    setBalance(wal?.csb_balance ?? 0);
    setTier(((sub?.tier as Tier) ?? "free"));

    const ids = Array.from(new Set([...feedRows, ...(mine ?? []), ...(feat ?? []), ...tallyTracks].map((t: any) => t.user_id).filter(Boolean)));
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, artist_name").in("id", ids);
      nameMap = new Map((profs ?? []).map((p) => [p.id, p.artist_name]));
    }

    const allPaths = [...feedRows, ...(mine ?? []), ...(feat ?? [])].map((t: any) => t.audio_path);
    const { signedTrackUrls } = await import("@/lib/storage");
    const urlMap = await signedTrackUrls(allPaths);
    const decorate = (rows: any[]): FeedTrack[] => (rows ?? []).map((t) => ({
      ...t,
      mode: t.mode as Mode,
      audio_url: urlMap.get(t.audio_path) ?? "",
      artist_name: nameMap.get(t.user_id),
      is_boosted: (boostMap.get(t.id) ?? 0) > 0,
      boost_rank: boostMap.get(t.id) ?? 0,
    }));

    setFeed(decorate(feedRows));
    setMyTracks(decorate(mine ?? []));
    setFeatured(decorate(feat ?? []));

    const trackMap = new Map(tallyTracks.map((t) => [t.id, t]));
    setLeaders(tallies
      .map((row) => {
        const track = trackMap.get(row.track_id);
        if (!track) return null;
        return {
          track_id: row.track_id,
          title: track.title,
          artist_name: nameMap.get(track.user_id) ?? "Unknown Artist",
          score_count: Number(row.score_count) || 0,
          average_score: Number(row.average_score) || 0,
          feature_worthy_count: Number(row.feature_worthy_count) || 0,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.average_score - a.average_score || b.score_count - a.score_count)
      .slice(0, 25) as LeaderRow[]);

    setLoading(false);
    setRefreshing(false);

    // Side fetches for HomeTab inner panels (best-effort, non-blocking)
    setSideLoading(true);
    const [{ data: crewRows }, { data: roomRows }, { data: weeklyRow }] = await Promise.all([
      supabase.from("crews").select("id, name, tag").order("created_at", { ascending: false }).limit(4),
      supabase.from("chatrooms").select("id, title, kind").eq("kind", "public").limit(4),
      supabase.from("weekly_contests").select("id, status, prize_usd_cents").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (crewRows?.length) {
      const { data: counts } = await supabase.from("crew_members").select("crew_id").in("crew_id", crewRows.map((c) => c.id));
      const cmap = new Map<string, number>();
      (counts ?? []).forEach((r: any) => cmap.set(r.crew_id, (cmap.get(r.crew_id) ?? 0) + 1));
      setCrews(crewRows.map((c) => ({ ...c, member_count: cmap.get(c.id) ?? 0 })));
    } else {
      setCrews([]);
    }
    setRooms(roomRows ?? []);
    setWeekly(weeklyRow ?? null);
    setSideLoading(false);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "track_boosts" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "track_scores" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_contests" }, () => loadAll())
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
    countedPlayRef.current.delete(track.id);
  };

  const countValidPlay = async (track: FeedTrack) => {
    if (track.user_id === user?.id || countedPlayRef.current.has(track.id)) return;
    countedPlayRef.current.add(track.id);
    const { error } = await supabase.rpc("increment_play_count", { _track_id: track.id });
    if (!error) {
      setFeed((cur) => cur.map((t) => t.id === track.id ? { ...t, play_count: t.play_count + 1 } : t));
    }
  };

  const rollTheDice = async () => {
    const modes: Mode[] = ["solo", "collab", "battle"];
    const pick = modes[Math.floor(Math.random() * modes.length)];

    if (pick === "battle") {
      // Find an open battle track to match against (excluding own)
      const { data: battleRows } = await supabase
        .from("tracks")
        .select("id, user_id, title")
        .eq("mode", "battle")
        .eq("is_hidden", false)
        .neq("user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false })
        .limit(20);
      if (battleRows && battleRows.length > 0) {
        const opp = battleRows[Math.floor(Math.random() * battleRows.length)];
        toast.success(`🎲 BATTLE! Matched against "${opp.title}". Drop your verse to enter the ring.`);
        navigate(`/studio?mode=battle&opponent=${opp.id}`);
        return;
      }
      toast.info("🎲 BATTLE! No opponents online — drop the first battle track.");
      navigate("/studio?mode=battle");
      return;
    }

    if (pick === "collab") {
      toast.success(`🎲 COLLAB! Pick a crew to invite into your session.`);
      navigate("/crews");
      return;
    }

    toast.success(`🎲 SOLO DROP! Hit record.`);
    navigate("/studio?mode=solo");
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
              feed={feed}
              crews={crews}
              rooms={rooms}
              sideLoading={sideLoading}
              weekly={weekly}
              onRoll={rollTheDice}
              onGoStudio={() => navigate("/studio")}
              onGoFeed={() => setTab("feed")}
              onGoCrews={() => navigate("/crews")}
              onGoWeekly={() => navigate("/weekly")}
              onGoChat={(roomId) => navigate(roomId ? `/chat/${roomId}` : "/chat")}
              onJudge={() => judging.open()}
              onBoost={() => navigate("/boosts")}
              onBeat={() => navigate("/beat-of-the-day")}
            />
          )}
          {tab === "feed" && (
            <FeedTab tracks={feed} featured={featured} playingId={playingId} onPlay={handlePlay} onMinuteListened={countValidPlay} />
          )}
          {tab === "studio" && (
            <StudioTab myTracks={myTracks} playingId={playingId} onPlay={handlePlay} onOpenStudio={() => navigate("/studio")} />
          )}
          {tab === "leaderboard" && <LeaderboardTab leaders={leaders} />}
          {tab === "wallet" && <WalletTab balance={balance} myTracks={myTracks} />}
        </div>
      </div>
    </div>
  );
};

/* ---------- Tabs ---------- */

const HomeTab = ({
  balance, myCount, feedCount, feed, crews, rooms, sideLoading, weekly,
  onRoll, onGoStudio, onGoFeed, onGoCrews, onGoWeekly, onGoChat, onJudge, onBoost, onBeat,
}: {
  balance: number; myCount: number; feedCount: number;
  feed: FeedTrack[]; crews: CrewRow[]; rooms: ChatRoomRow[];
  sideLoading: boolean;
  weekly: { id: string; status: string; prize_usd_cents: number } | null;
  onRoll: () => void; onGoStudio: () => void; onGoFeed: () => void;
  onGoCrews: () => void; onGoWeekly: () => void; onGoChat: (roomId?: string) => void;
  onJudge: () => void; onBoost: () => void; onBeat: () => void;
}) => {
  const battles = feed.filter((t) => t.mode === "battle").slice(0, 3);
  const trending = feed.slice(0, 3);
  const weeklyOpen = weekly?.status === "submissions";
  const weeklyVoting = weekly?.status === "voting";
  const weeklyCta = weeklyOpen ? "ENTER" : weeklyVoting ? "VOTE" : weekly ? "WATCH" : "ENTER";
  const weeklyLabel = weekly
    ? `Weekly · $${Math.round((weekly.prize_usd_cents ?? 0) / 100)}`
    : "Weekly Contest";
  return (
    <div className="space-y-4">
      {/* Hero — ROLL THE DICE */}
      <div className="relative rounded-3xl overflow-hidden border border-primary/30 p-8 text-center"
        style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 25% / 0.5), hsl(0 0% 5%) 70%)" }}>
        <div className="absolute -top-10 left-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" />
        <div className="absolute -top-10 right-1/4 h-40 w-24 bg-primary/20 blur-2xl animate-spotlight" style={{ animationDelay: "1s" }} />
        <div className="relative">
          <div className="mx-auto h-20 w-20 grid place-items-center rounded-2xl bg-primary text-primary-foreground glow-primary animate-dice-roll">
            <Dice5 className="h-12 w-12" strokeWidth={2.5} />
          </div>
          <h2 className="font-display text-3xl mt-4 text-glow">CASH STAGE GAME</h2>
          <p className="text-xs text-muted-foreground mt-1">No Drama. Just Battles.</p>
          <button onClick={onRoll}
            className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2 hover:scale-105 transition-transform glow-primary">
            <Dice5 className="h-4 w-4" /> Roll & Record
          </button>
        </div>
      </div>

      {/* No-AI badge */}
      <div className="flex items-center justify-center gap-2 py-2 rounded-full bg-secondary/60 border border-primary/30">
        <ShieldOff className="h-3.5 w-3.5 text-primary" />
        <p className="text-[10px] font-bold tracking-widest text-primary">100% HUMAN · NO AI · RECORDED IN-APP</p>
      </div>

      {/* 4 main action cards */}
      <div className="grid grid-cols-2 gap-3">
        <ActionCard Icon={Dice5} label="Roll & Match" cta="ROLL" tone="primary" onClick={onRoll} />
        <ActionCard Icon={Mic} label="Solo Battle" cta="START" tone="accent" onClick={onGoStudio} />
        <ActionCard Icon={Users} label="Collab" cta="INVITE" tone="blue" onClick={onGoCrews} />
        <ActionCard
          Icon={Trophy}
          label={weeklyLabel}
          cta={weeklyCta}
          tone="primary"
          onClick={onGoWeekly}
          status={weekly?.status?.toUpperCase() ?? "OPEN"}
        />
      </div>

      {/* Inner tabs: Feed / Battles / Crews / Chat */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-card border border-border">
          <TabsTrigger value="feed" className="text-[11px] font-bold tracking-wider">FEED</TabsTrigger>
          <TabsTrigger value="battles" className="text-[11px] font-bold tracking-wider">BATTLES</TabsTrigger>
          <TabsTrigger value="crews" className="text-[11px] font-bold tracking-wider">CREWS</TabsTrigger>
          <TabsTrigger value="chat" className="text-[11px] font-bold tracking-wider">CHAT</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-2">
          {trending.length === 0 ? (
            <MiniEmpty text="No drops yet — be the first." />
          ) : trending.map((t) => (
            <button key={t.id} onClick={onGoFeed}
              className="w-full text-left p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
              <p className="font-semibold truncate flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" /> {t.title}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5 truncate">
                {(t.artist_name ?? "ANON").toUpperCase()} · {t.play_count.toLocaleString()} PLAYS
              </p>
              <Badge variant="secondary" className="mt-2 text-[9px] tracking-widest">{t.mode.toUpperCase()}</Badge>
            </button>
          ))}
          {trending.length > 0 && (
            <button onClick={onGoFeed} className="w-full text-[11px] font-bold tracking-widest text-primary py-2">
              VIEW FULL FEED →
            </button>
          )}
        </TabsContent>

        <TabsContent value="battles" className="space-y-2">
          {battles.length === 0 ? (
            <MiniEmpty text="No active battles. Start one in the studio." />
          ) : battles.map((t) => (
            <div key={t.id} className="p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
              <p className="font-semibold truncate flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" /> {t.title}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5 truncate">
                {(t.artist_name ?? "ANON").toUpperCase()} · BATTLE MODE
              </p>
              <button onClick={onGoFeed}
                className="w-full mt-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                WATCH
              </button>
            </div>
          ))}
          <button onClick={onGoStudio}
            className="w-full py-2 rounded-lg bg-secondary border border-primary/30 text-xs font-bold tracking-widest text-primary">
            START NEW BATTLE
          </button>
        </TabsContent>

        <TabsContent value="crews" className="space-y-2">
          {sideLoading ? <MiniSkeleton /> : crews.length === 0 ? (
            <MiniEmpty text="No crews yet. Be the founder." />
          ) : crews.map((c, i) => (
            <button key={c.id} onClick={onGoCrews}
              className="w-full text-left p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
              <p className="font-semibold truncate flex items-center gap-2">
                <Users className="h-4 w-4 text-battle-blue" /> {c.name}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5">
                [{c.tag}] · {c.member_count} MEMBERS
              </p>
              <Badge variant="secondary" className="mt-2 text-[9px] tracking-widest">
                {i === 0 ? "ELITE" : "RISING"}
              </Badge>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="chat" className="space-y-2">
          {sideLoading ? <MiniSkeleton /> : rooms.length === 0 ? (
            <MiniEmpty text="No public rooms open right now." />
          ) : rooms.map((r) => (
            <div key={r.id} className="p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
              <p className="font-semibold truncate flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent" /> {r.title}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-widest mt-0.5">PUBLIC ROOM</p>
              <button onClick={() => onGoChat(r.id)}
                className="w-full mt-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                ENTER
              </button>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Quick actions row */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onJudge} className="rounded-xl border border-accent/40 bg-accent/5 p-2.5 text-center hover:border-accent">
          <Gavel className="h-4 w-4 mx-auto text-accent" />
          <p className="text-[9px] tracking-widest text-accent font-bold mt-1">JUDGE</p>
        </button>
        <button onClick={onBoost} className="rounded-xl border border-primary/40 bg-primary/5 p-2.5 text-center hover:border-primary">
          <Star className="h-4 w-4 mx-auto text-primary" />
          <p className="text-[9px] tracking-widest text-primary font-bold mt-1">BOOST</p>
        </button>
        <button onClick={onBeat} className="rounded-xl border border-border bg-card p-2.5 text-center hover:border-primary">
          <Music className="h-4 w-4 mx-auto text-foreground" />
          <p className="text-[9px] tracking-widest text-muted-foreground font-bold mt-1">BEAT/DAY</p>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Balance" value={`${balance.toLocaleString()}`} sub="CSB" />
        <Stat label="My Tracks" value={myCount.toString()} sub="dropped" />
        <Stat label="Feed" value={feedCount.toString()} sub="live tracks" />
      </div>

      <button onClick={onGoStudio}
        className="w-full py-4 rounded-2xl bg-secondary border border-primary/30 hover:border-primary font-bold inline-flex items-center justify-center gap-2">
        <Headphones className="h-4 w-4 text-primary" /> Open Full Studio
      </button>

      {/* Safety footer */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground tracking-widest">
        <Shield className="h-3 w-3" />
        <p>BLOCK = NO ACCESS TO YOUR CONTENT OR VOTING</p>
      </div>
    </div>
  );
};

const ActionCard = ({
  Icon, label, cta, tone, onClick, status,
}: { Icon: typeof Mic; label: string; cta: string; tone: "primary" | "accent" | "blue"; onClick: () => void; status?: string; }) => {
  const toneCls =
    tone === "primary" ? "border-primary/40 hover:border-primary text-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
    : tone === "accent" ? "border-accent/40 hover:border-accent text-accent hover:shadow-[0_0_20px_hsl(var(--accent)/0.4)]"
    : "border-battle-blue/40 hover:border-battle-blue text-battle-blue";
  const btnCls =
    tone === "primary" ? "bg-primary text-primary-foreground"
    : tone === "accent" ? "bg-accent text-accent-foreground"
    : "bg-battle-blue text-background";
  return (
    <div className={`p-4 rounded-2xl bg-card border ${toneCls} text-center transition-all`}>
      <Icon className="h-5 w-5 mx-auto" />
      <p className="text-xs font-bold mt-2 text-foreground">{label}</p>
      {status && (
        <p className="text-[8px] tracking-widest text-muted-foreground mt-0.5">{status}</p>
      )}
      <button onClick={onClick}
        className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold tracking-widest ${btnCls}`}>
        {cta}
      </button>
    </div>
  );
};

const MiniEmpty = ({ text }: { text: string }) => (
  <div className="text-center py-6 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
    {text}
  </div>
);

const MiniSkeleton = () => (
  <div className="space-y-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="p-3 rounded-2xl bg-card border border-border animate-pulse">
        <div className="h-3 w-2/3 bg-secondary rounded" />
        <div className="h-2 w-1/3 bg-secondary/60 rounded mt-2" />
      </div>
    ))}
  </div>
);

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="p-4 rounded-2xl bg-card border border-border text-center">
    <p className="text-[9px] tracking-widest text-muted-foreground">{label.toUpperCase()}</p>
    <p className="font-display text-2xl mt-1">{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);

const FeedTab = ({ tracks, featured, playingId, onPlay, onMinuteListened }: { tracks: FeedTrack[]; featured: FeedTrack[]; playingId: string | null; onPlay: (t: FeedTrack) => void; onMinuteListened: (t: FeedTrack) => void; }) => (
  <div className="space-y-3">
    {featured.length > 0 && (
      <>
        <h2 className="font-display text-2xl flex items-center gap-2"><Star className="h-5 w-5 text-accent" /> Featured Tracks</h2>
        {featured.map((t) => (
          <TrackRow key={`f-${t.id}`} t={t} isPlaying={playingId === t.id} onPlay={() => onPlay(t)} onMinuteListened={() => onMinuteListened(t)} showArtist />
        ))}
      </>
    )}
    <h2 className="font-display text-2xl">🔥 Trending Drops</h2>
    {tracks.length === 0 ? (
      <Empty icon={Flame} title="NO TRACKS YET" sub="Be the first to drop one in the studio." />
    ) : tracks.map((t) => (
      <TrackRow key={t.id} t={t} isPlaying={playingId === t.id} onPlay={() => onPlay(t)} onMinuteListened={() => onMinuteListened(t)} showArtist />
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

const LeaderboardTab = ({ leaders }: { leaders: LeaderRow[] }) => (
  <div className="space-y-3">
    <div className="rounded-3xl border border-primary/40 bg-primary/5 p-5 shadow-[var(--shadow-neon)]">
      <p className="text-[10px] tracking-widest text-primary font-bold">ANONYMOUS JS TALLIES</p>
      <h2 className="font-display text-3xl text-glow mt-1">Neon Scoreboard</h2>
      <p className="text-xs text-muted-foreground mt-1">Only score count and average are public. Judge identities stay hidden.</p>
    </div>
    {leaders.length === 0 ? (
      <Empty icon={Trophy} title="NO JS TALLIES YET" sub="Anonymous scores appear after judging sessions." />
    ) : leaders.map((row, i) => (
      <div key={row.track_id}
        className="flex items-center gap-3 p-3 rounded-2xl border bg-card border-border hover:border-primary/50 transition-all">
        <div className={`h-10 w-10 grid place-items-center rounded-full font-display text-lg ${
          i === 0 ? "bg-accent text-accent-foreground" :
          i === 1 ? "bg-secondary text-foreground" :
          i === 2 ? "bg-primary/30 text-primary" :
          "bg-secondary text-muted-foreground"
        }`}>
          {i + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{row.title}</p>
          <p className="text-[10px] text-muted-foreground tracking-widest">
            {row.artist_name.toUpperCase()} · {row.score_count} SCORES · {row.feature_worthy_count} FEATURE PICKS
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-primary text-glow">{row.average_score.toFixed(1)}</p>
          <p className="text-[9px] tracking-widest text-muted-foreground">AVG</p>
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
  t, isPlaying, onPlay, showArtist, onMinuteListened,
}: { t: FeedTrack; isPlaying: boolean; onPlay: () => void; showArtist?: boolean; onMinuteListened?: () => void; }) => {
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
            {t.is_boosted ? "🚀 BOOSTED · " : ""}
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
        <audio
          src={t.audio_url}
          controls
          autoPlay
          className="w-full mt-3"
          onTimeUpdate={(event) => {
            if (event.currentTarget.currentTime >= 60) onMinuteListened?.();
          }}
        />
      )}
      <div className="mt-2 flex justify-end">
        <ReportTrackButton trackId={t.id} />
      </div>
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
