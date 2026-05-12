import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Gavel, Lock, Play, Pause, Loader2, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signedTrackUrls } from "@/lib/storage";
import { toast } from "sonner";

/**
 * Anonymous in-app Judging Session (JS).
 *  - Auto-opens a 10-minute timer once per login (also openable manually).
 *  - Boosted tracks come first, then chronological.
 *  - Track must be FULLY listened (>=99% playback) before the score+questionnaire unlocks.
 *  - Up to 250 JS scores per judge per day; each fully-listened track pays 1 CSB.
 *  - Voter identities are NEVER exposed to artists. Only aggregated tallies are public.
 */

const SESSION_KEY = "cashstage:judging-session-shown";
const DAILY_CAP = 250;

type JudgeTrack = {
  id: string;
  user_id: string;
  title: string;
  audio_path: string;
  duration_seconds: number;
  audio_url?: string;
  is_boosted: boolean;
};

type Ctx = { open: () => void };
const JudgingCtx = createContext<Ctx>({ open: () => {} });
export const useJudging = () => useContext(JudgingCtx);

export const JudgingTimerProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<JudgeTrack[]>([]);
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [percentListened, setPercentListened] = useState(0);
  const [fullyListened, setFullyListened] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [featureWorthy, setFeatureWorthy] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState("");
  const [improvement, setImprovement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);

  const current = tracks[idx];
  const reachedCap = todayCount >= DAILY_CAP;

  const loadDailyCount = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await supabase
      .from("track_scores")
      .select("*", { count: "exact", head: true })
      .eq("judge_id", user.id)
      .eq("score_date", today);
    setTodayCount(count ?? 0);
  }, [user]);

  const loadQueue = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: boosts } = await supabase
      .from("track_boosts")
      .select("track_id")
      .gt("votes_remaining", 0);
    const boostedIds = new Set((boosts ?? []).map((b) => b.track_id));

    let boostedTracks: JudgeTrack[] = [];
    if (boostedIds.size > 0) {
      const { data: bt } = await supabase
        .from("tracks")
        .select("id, user_id, title, audio_path, duration_seconds")
        .in("id", Array.from(boostedIds))
        .neq("user_id", user.id);
      boostedTracks = (bt ?? []).map((t) => ({ ...t, is_boosted: true } as JudgeTrack));
    }

    const { data: others } = await supabase
      .from("tracks")
      .select("id, user_id, title, audio_path, duration_seconds")
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    const otherTracks: JudgeTrack[] = (others ?? [])
      .filter((t) => !boostedIds.has(t.id))
      .map((t) => ({ ...t, is_boosted: false } as JudgeTrack));

    const queue = [...boostedTracks, ...otherTracks].slice(0, 25);
    const urls = await signedTrackUrls(queue.map((t) => t.audio_path));
    setTracks(queue.map((t) => ({ ...t, audio_url: urls.get(t.audio_path) ?? "" })));
    setIdx(0);
    resetTrackState();
    setLoading(false);
  }, [user]);

  const resetTrackState = () => {
    setPercentListened(0);
    setFullyListened(false);
    setScore(null);
    setFeatureWorthy(null);
    setFavorite("");
    setImprovement("");
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  };

  const startSession = useCallback(async () => {
    setOpen(true);
    setSecondsLeft(600);
    await Promise.all([loadDailyCount(), loadQueue()]);
  }, [loadDailyCount, loadQueue]);

  // Auto-open once per login
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(SESSION_KEY) === user.id) return;
    sessionStorage.setItem(SESSION_KEY, user.id);
    const t = setTimeout(() => { startSession(); }, 1500);
    return () => clearTimeout(t);
  }, [user?.id, startSession]);

  // 10-minute countdown
  useEffect(() => {
    if (!open) return;
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { closeSession(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeSession = () => {
    setOpen(false);
    resetTrackState();
  };

  // Reset state when changing track
  useEffect(() => { resetTrackState(); /* eslint-disable-next-line */ }, [idx]);

  const togglePlay = () => {
    if (!current?.audio_url) { toast.error("Track unavailable"); return; }
    if (playing && audioRef.current) {
      audioRef.current.pause(); setPlaying(false); return;
    }
    if (!audioRef.current) {
      const a = new Audio(current.audio_url);
      a.ontimeupdate = () => {
        if (!a.duration || !isFinite(a.duration)) return;
        const pct = Math.min(100, Math.round((a.currentTime / a.duration) * 100));
        setPercentListened(pct);
        if (pct >= 99) setFullyListened(true);
      };
      a.onended = () => { setFullyListened(true); setPlaying(false); };
      audioRef.current = a;
    }
    audioRef.current.play().then(() => setPlaying(true)).catch(() => toast.error("Playback failed"));
  };

  const submitJudgment = async () => {
    if (!user || !current || score == null) return;
    if (!fullyListened) { toast.error("Listen to the full track first"); return; }
    if (reachedCap) { toast.error("Daily judging cap reached (250)"); return; }
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("submit_track_score", {
      _track_id: current.id,
      _score: score,
      _feature_worthy: featureWorthy,
      _favorite_bars: favorite.trim().slice(0, 500) || null,
      _needs_improvement: improvement.trim().slice(0, 500) || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("duplicate")) toast.message("Already judged today");
      else if (error.message.toLowerCase().includes("daily judging")) toast.error("Daily cap reached");
      else toast.error(error.message);
      return;
    }
    toast.success("🔒 Anonymous judgment locked · +1 CSB earned");
    setTodayCount((n) => n + 1);
    if (idx < tracks.length - 1) setIdx(idx + 1);
    else closeSession();
  };

  const skip = () => { if (idx < tracks.length - 1) setIdx(idx + 1); };

  const value = useMemo(() => ({ open: startSession }), [startSession]);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const canScore = fullyListened && !reachedCap;

  return (
    <JudgingCtx.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(v) => !v && closeSession()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" /> JS · Anonymous
              <span className="ml-auto font-display text-2xl text-accent">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Artists never see who judged. Drama-free zone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between text-[10px] tracking-widest text-muted-foreground">
            <span>TODAY: {todayCount}/{DAILY_CAP}</span>
            <span>+1 CSB per fully listened track</span>
          </div>

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /></div>
          ) : reachedCap ? (
            <div className="py-12 text-center">
              <p className="font-display text-xl">Daily JS cap reached</p>
              <p className="text-sm text-muted-foreground mt-1">Come back tomorrow for 250 more.</p>
              <Button variant="outline" className="mt-3" onClick={closeSession}>Close</Button>
            </div>
          ) : !current ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No tracks available right now.</p>
              <Button variant="outline" className="mt-3" onClick={closeSession}>Close</Button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="h-12 w-12 grid place-items-center rounded-full bg-primary text-primary-foreground"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">Track {idx + 1} of {tracks.length}</p>
                    <p className="text-[10px] text-muted-foreground tracking-widest">
                      {current.is_boosted ? "🚀 BOOSTED · " : ""}IDENTITY HIDDEN
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all ${fullyListened ? "bg-primary" : "bg-accent"}`}
                    style={{ width: `${percentListened}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{percentListened}% listened</span>
                  <span>{fullyListened ? "Questionnaire unlocked ✓" : "Full listen required"}</span>
                </div>
              </div>

              {/* Score 1–10 */}
              <div className="mt-3">
                <p className="text-[10px] tracking-widest text-muted-foreground mb-1">SCORE 1–10</p>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const n = i + 1;
                    return (
                      <button
                        key={n}
                        onClick={() => setScore(n)}
                        disabled={!canScore}
                        className={`h-10 rounded-md border text-xs font-bold transition disabled:opacity-40 ${
                          score === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border hover:border-primary"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q1: Feature worthy */}
              <div className="mt-3">
                <p className="text-sm font-semibold">1. Feature worthy?</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    variant={featureWorthy === true ? "default" : "outline"}
                    size="sm" disabled={!canScore}
                    onClick={() => setFeatureWorthy(true)}
                  >Yes</Button>
                  <Button
                    variant={featureWorthy === false ? "default" : "outline"}
                    size="sm" disabled={!canScore}
                    onClick={() => setFeatureWorthy(false)}
                  >No</Button>
                </div>
              </div>

              {/* Q2: Favorite bars */}
              <div className="mt-3">
                <p className="text-sm font-semibold">2. Favorite bars or line?</p>
                <Textarea
                  value={favorite}
                  onChange={(e) => setFavorite(e.target.value.slice(0, 500))}
                  placeholder="Optional · max 500 chars"
                  disabled={!canScore}
                  className="mt-1 min-h-[60px]"
                />
              </div>

              {/* Q3: Needs improvement */}
              <div className="mt-3">
                <p className="text-sm font-semibold">3. Needs improvement?</p>
                <Textarea
                  value={improvement}
                  onChange={(e) => setImprovement(e.target.value.slice(0, 500))}
                  placeholder="Optional · max 500 chars"
                  disabled={!canScore}
                  className="mt-1 min-h-[60px]"
                />
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <Link to="/boosts" className="text-[10px] tracking-widest text-primary font-bold inline-flex items-center gap-1">
                  <Star className="h-3 w-3" /> BOOST YOUR TRACK
                </Link>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={skip} disabled={idx >= tracks.length - 1}>Skip</Button>
                  <Button size="sm" onClick={submitJudgment} disabled={!canScore || score == null || submitting}>
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                      <><Lock className="h-3 w-3 mr-1" /> Lock anonymous</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </JudgingCtx.Provider>
  );
};
