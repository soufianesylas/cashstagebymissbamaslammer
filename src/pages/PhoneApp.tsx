import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signedTrackUrls } from "@/lib/storage";
import { toast } from "sonner";
import HomeScreen from "@/components/phone/HomeScreen";
import BattleScreen from "@/components/phone/BattleScreen";
import SoloDropScreen from "@/components/phone/SoloDropScreen";
import CollabScreen, { type CollabItem, type CollabTab } from "@/components/phone/CollabScreen";
import WalletScreen, { type WalletTx } from "@/components/phone/WalletScreen";
import PhoneTabBar from "@/components/phone/PhoneTabBar";

type Tab = "home" | "battles" | "studio" | "collab" | "wallet";

interface TrackRow {
  id: string;
  title: string;
  mode: "solo" | "collab" | "battle";
  audio_path: string;
  duration_seconds: number;
  play_count: number;
  user_id: string;
}

interface BattleRow extends TrackRow {
  artist_name: string;
  audio_url: string;
}

const formatRel = (iso: string) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diffMs < day) return "Today";
  if (diffMs < 2 * day) return "Yesterday";
  return `${Math.floor(diffMs / day)} days ago`;
};

const formatPlays = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const PhoneApp = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [artistName, setArtistName] = useState("Artist");
  const [balance, setBalance] = useState(0);
  const [todayDelta, setTodayDelta] = useState(0);
  const [feed, setFeed] = useState<BattleRow[]>([]);
  const [trending, setTrending] = useState<BattleRow[]>([]);
  const [collabs, setCollabs] = useState<CollabItem[]>([]);
  const [collabTab, setCollabTab] = useState<CollabTab>("open");
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [walletTab, setWalletTab] = useState<"tx" | "earnings">("tx");

  const [activeBattle, setActiveBattle] = useState<{ red?: BattleRow; blue?: BattleRow } | null>(null);
  const [playingSide, setPlayingSide] = useState<"red" | "blue" | null>(null);
  const [voted, setVoted] = useState<"red" | "blue" | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<BattleRow | null>(null);
  const [playingDrop, setPlayingDrop] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadAll = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [{ data: prof }, { data: wal }, { data: tracks }, { data: boostsToday }] = await Promise.all([
        supabase.from("profiles").select("id, artist_name").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("csb_balance").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("tracks")
          .select("id, title, mode, audio_path, duration_seconds, play_count, user_id, created_at")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("track_boosts")
          .select("created_at")
          .eq("owner_id", user.id)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setArtistName(prof?.artist_name || user.email?.split("@")[0] || "Artist");
      setBalance(wal?.csb_balance ?? 0);
      setTodayDelta(0); // simple: leave 0 unless we add a ledger query later

      const rows = (tracks ?? []) as TrackRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, artist_name").in("id", userIds);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.artist_name));
      }
      const urlMap = await signedTrackUrls(rows.map((r) => r.audio_path));
      const decorated: BattleRow[] = rows.map((r) => ({
        ...r,
        artist_name: nameMap.get(r.user_id) ?? "Unknown",
        audio_url: urlMap.get(r.audio_path) ?? "",
      }));
      setFeed(decorated);

      // Trending = top by play_count
      setTrending([...decorated].sort((a, b) => b.play_count - a.play_count).slice(0, 8));

      // Pick an active battle pair from latest battle-mode tracks (excluding own)
      const battles = decorated.filter((d) => d.mode === "battle" && d.user_id !== user.id);
      if (battles.length >= 2) setActiveBattle({ red: battles[0], blue: battles[1] });
      else if (battles.length === 1) setActiveBattle({ red: battles[0] });
      else setActiveBattle(null);

      // Default selected drop (first non-self solo, fallback to first feed)
      const firstSolo = decorated.find((d) => d.mode === "solo" && d.user_id !== user.id) ?? decorated[0];
      setSelectedDrop((cur) => cur ?? firstSolo ?? null);

      // Collabs = recent collab-mode tracks shown as open collabs
      const openCollabs = decorated.filter((d) => d.mode === "collab").slice(0, 10);
      setCollabs(
        openCollabs.map((c) => ({
          id: c.id,
          name: c.title.toUpperCase(),
          by: c.artist_name,
          joined: "1/4",
        }))
      );

      // Wallet activity: build a simple ledger from recent boosts + play rewards (best-effort)
      const myBoosts = (boostsToday ?? []).slice(0, 5);
      setTxs([
        ...myBoosts.map((b: any, i: number) => ({
          id: `boost-${i}`,
          label: "Boost Track",
          time: formatRel(b.created_at),
          amt: "-20 CSB",
          up: false,
        })),
      ]);
    } catch (e: any) {
      console.error("PhoneApp loadAll", e);
      toast.error("Couldn't load your data. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("phone-app")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tracks" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const playUrl = async (url: string, onEnded?: () => void) => {
    if (!url) return toast.error("No audio available.");
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.pause();
    audioRef.current.src = url;
    audioRef.current.onended = () => onEnded?.();
    try { await audioRef.current.play(); }
    catch { toast.error("Couldn't play track."); }
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    setPlayingSide(null);
    setPlayingDrop(false);
  };

  useEffect(() => () => stopAudio(), []);

  // ---- Action handlers ----
  const handleStartBattle = () => {
    setTab("battles");
    if (!activeBattle?.red) toast.info("No open battles right now — record a battle verse in Studio.");
  };

  const handleMode = (mode: "solo" | "collab" | "battle") => {
    navigate(`/studio?mode=${mode}`);
  };

  const handleVote = async (side: "red" | "blue") => {
    if (voted) return;
    const trackId = side === "red" ? activeBattle?.red?.id : activeBattle?.blue?.id;
    if (!trackId) return;
    setVoted(side); // optimistic, locks UI
    const { error } = await supabase.rpc("submit_track_score", {
      _track_id: trackId,
      _score: 5,
      _feature_worthy: true,
    } as any);
    if (error) {
      setVoted(null);
      toast.error("Vote failed: " + (error.message || "unknown error"));
    } else {
      toast.success("🔒 Vote locked. Anonymous & counted.");
    }
  };

  const handlePlayVerse = async (side: "red" | "blue") => {
    if (playingSide === side) { stopAudio(); return; }
    const t = side === "red" ? activeBattle?.red : activeBattle?.blue;
    if (!t?.audio_url) return toast.error("No audio for this verse.");
    setPlayingSide(side);
    await playUrl(t.audio_url, () => setPlayingSide(null));
  };

  const handlePlayDrop = async () => {
    if (!selectedDrop?.audio_url) return toast.error("No audio for this drop.");
    if (playingDrop) { stopAudio(); return; }
    setPlayingDrop(true);
    await playUrl(selectedDrop.audio_url, () => setPlayingDrop(false));
    if (selectedDrop.user_id !== user?.id) {
      supabase.rpc("increment_play_count", { _track_id: selectedDrop.id }).then(() => {});
    }
  };

  const handlePlayTrendingTrack = async (id: string) => {
    const t = trending.find((x) => x.id === id) ?? feed.find((x) => x.id === id);
    if (!t) return;
    setSelectedDrop(t);
    setTab("studio");
    setTimeout(() => handlePlayDrop(), 100);
  };

  const handleDeposit = () => navigate("/pricing");
  const handleWithdraw = () => toast.info("Withdrawals open at $50 minimum balance. Currently in review.");
  const handleConnectPayPal = () => toast.info("PayPal connect — coming in next release.");
  const handleConnectStripe = () => toast.info("Stripe connect — coming in next release.");

  const handleBoostTrack = () => navigate("/boosts");
  const handleTip = async () => {
    if (!selectedDrop) return;
    if (balance < 25) return toast.error("Not enough CSB to tip. Top up in Wallet.");
    const { error: w } = await supabase.from("wallets").update({ csb_balance: balance - 25 }).eq("user_id", user!.id);
    if (w) return toast.error("Tip failed: " + w.message);
    toast.success(`Tipped 25 CSB to ${selectedDrop.artist_name} 🎉`);
    setBalance((b) => b - 25);
  };

  const handleSignOut = async () => {
    stopAudio();
    await signOut();
    navigate("/auth", { replace: true });
  };

  // ---- Derived screen props ----
  const homeProps = useMemo(() => ({
    artistName,
    csbBalance: balance,
    notificationCount: 0,
    liveBattles: feed.slice(0, 6).map((t) => ({
      id: t.id,
      name: t.artist_name,
      plays: formatPlays(t.play_count),
      live: t.mode === "battle",
    })),
    trending: trending.map((t) => ({
      id: t.id,
      title: t.title,
      plays: formatPlays(t.play_count),
    })),
    onSearch: () => toast.info("Search — coming next release."),
    onNotifications: () => toast.info("No new notifications."),
    onStartBattle: handleStartBattle,
    onMode: handleMode,
    onViewAllBattles: () => setTab("battles"),
    onViewAllTrending: () => setTab("studio"),
    onOpenBattle: (id: string) => {
      const t = feed.find((x) => x.id === id);
      if (t) {
        setActiveBattle({ red: t, blue: activeBattle?.blue });
        setTab("battles");
      }
    },
    onPlayTrack: handlePlayTrendingTrack,
  }), [artistName, balance, feed, trending, activeBattle]);

  const battleProps = useMemo(() => ({
    redName: activeBattle?.red?.artist_name ?? "Awaiting Red",
    blueName: activeBattle?.blue?.artist_name ?? "Awaiting Blue",
    redDuration: activeBattle?.red ? `${Math.floor(activeBattle.red.duration_seconds / 60)}:${String(activeBattle.red.duration_seconds % 60).padStart(2, "0")}` : "—",
    blueDuration: activeBattle?.blue ? `${Math.floor(activeBattle.blue.duration_seconds / 60)}:${String(activeBattle.blue.duration_seconds % 60).padStart(2, "0")}` : "—",
    prizePoolCsb: 1250,
    voted,
    playingSide,
    onBack: () => setTab("home"),
    onPlayVerse: handlePlayVerse,
    onBoostPool: () => navigate("/boosts"),
    onVote: handleVote,
    onOpenChat: () => navigate("/chat"),
  }), [activeBattle, voted, playingSide]);

  const dropProps = useMemo(() => ({
    title: selectedDrop?.title?.toUpperCase() ?? "—",
    artist: selectedDrop?.artist_name ?? "—",
    explicit: false,
    heatPercent: Math.min(100, (selectedDrop?.play_count ?? 0) / 2),
    plays: formatPlays(selectedDrop?.play_count ?? 0),
    likes: "—",
    tips: "—",
    commentCount: 0,
    playing: playingDrop,
    onBack: () => setTab("home"),
    onPlay: handlePlayDrop,
    onTip: handleTip,
    onBoost: handleBoostTrack,
    onComments: () => toast.info("Comments — coming next release."),
  }), [selectedDrop, playingDrop, balance]);

  const collabProps = useMemo(() => ({
    tab: collabTab,
    onTabChange: setCollabTab,
    items: collabs,
    onMenu: () => navigate("/crews"),
    onCreateTrack: () => navigate("/studio?mode=collab"),
    onJoinOpen: () => toast.info("Browse open collabs in the list below."),
    onRandomMatch: () => navigate("/studio?mode=collab&random=1"),
    onViewAll: () => navigate("/crews"),
    onJoin: (id: string) => {
      const c = collabs.find((x) => x.id === id);
      navigate(`/studio?mode=collab&join=${id}`);
      if (c) toast.success(`Joining "${c.name}"…`);
    },
  }), [collabTab, collabs]);

  const walletProps = useMemo(() => ({
    csbBalance: balance,
    todayDelta,
    payPalConnected: false,
    stripeConnected: false,
    activeTab: walletTab,
    txs,
    onMenu: () => navigate("/boosts"),
    onDeposit: handleDeposit,
    onWithdraw: handleWithdraw,
    onConnectPayPal: handleConnectPayPal,
    onConnectStripe: handleConnectStripe,
    onTabChange: setWalletTab,
  }), [balance, todayDelta, walletTab, txs]);

  const ScreenForTab = () => {
    switch (tab) {
      case "home": return <HomeScreen {...homeProps} />;
      case "battles": return <BattleScreen {...battleProps} />;
      case "studio": return <SoloDropScreen {...dropProps} />;
      case "collab": return <CollabScreen {...collabProps} />;
      case "wallet": return <WalletScreen {...walletProps} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top action bar — only on desktop / non-native, hidden on small mobile to feel native */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border md:px-6">
        <button
          onClick={() => loadAll()}
          aria-label="Refresh"
          className="h-9 w-9 grid place-items-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <p className="font-display tracking-widest text-xs">CASH STAGE</p>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="h-9 w-9 grid place-items-center rounded-full bg-secondary hover:bg-destructive/20 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile-first phone surface */}
      <div className="flex-1 mx-auto w-full max-w-md relative overflow-hidden">
        <div className="h-[calc(100vh-3.25rem)] relative">
          <ScreenForTab />
          <PhoneTabBar active={tab} onChange={setTab} />
        </div>
      </div>
    </div>
  );
};

export default PhoneApp;
