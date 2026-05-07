import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gavel, Lock, Play, Pause, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signedTrackUrls } from "@/lib/storage";
import { toast } from "sonner";

/**
 * Anonymous in-app judging session.
 *  - Auto-opens a 10-minute timer once per login.
 *  - Boosted tracks come first, then chronological.
 *  - Each track must be played at least 60 seconds before the score buttons unlock
 *    (no view counts under one minute).
 *  - Scores are private — only aggregate tallies are exposed.
 */

const SESSION_KEY = "cashstage:judging-session-shown";
const MIN_LISTEN_MS = 60_000;

type JudgeTrack = {
  id: string;
  user_id: string;
  title: string;
  audio_path: string;
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
  const [listened, setListened] = useState(0);
  const [scored, setScored] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);

  const current = tracks[idx];

  const loadQueue = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Boosted track ids (have remaining vote credits)
    const { data: boosts } = await supabase
      .from("track_boosts")
      .select("track_id")
      .gt("votes_remaining", 0);
    const boostedIds = new Set((boosts ?? []).map((b) => b.track_id));

    let boostedTracks: JudgeTrack[] = [];
    if (boostedIds.size > 0) {
      const { data: bt } = await supabase
        .from("tracks")
        .select("id, user_id, title, audio_path")
        .in("id", Array.from(boostedIds))
        .neq("user_id", user.id);
      boostedTracks = (bt ?? []).map((t) => ({ ...t, is_boosted: true } as JudgeTrack));
    }

    const { data: others } = await supabase
      .from("tracks")
      .select("id, user_id, title, audio_path")
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const otherTracks: JudgeTrack[] = (others ?? [])
      .filter((t) => !boostedIds.has(t.id))
      .map((t) => ({ ...t, is_boosted: false } as JudgeTrack));

    const queue = [...boostedTracks, ...otherTracks].slice(0, 10);
    const urls = await signedTrackUrls(queue.map((t) => t.audio_path));
    setTracks(queue.map((t) => ({ ...t, audio_url: urls.get(t.audio_path) ?? "" })));
    setIdx(0); setListened(0); setScored(new Set());
    setLoading(false);
  }, [user]);

  const startSession = useCallback(async () => {
    setOpen(true);
    setSecondsLeft(600);
    await loadQueue();
  }, [loadQueue]);

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
    setOpen(false); setPlaying(false);
    audioRef.current?.pause();
    audioRef.current = null;
  };

  // Track listen-time on current track
  useEffect(() => {
    setListened(0);
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }, [idx, open]);

  const togglePlay = () => {
    if (!current?.audio_url) { toast.error("Track unavailable"); return; }
    if (playing && audioRef.current) {
      audioRef.current.pause(); setPlaying(false); return;
    }
    if (!audioRef.current) {
      const a = new Audio(current.audio_url);
      a.ontimeupdate = () => setListened(Math.floor((a.currentTime ?? 0) * 1000));
      a.onended = () => setPlaying(false);
      audioRef.current = a;
    }
    audioRef.current.play().then(() => setPlaying(true)).catch(() => toast.error("Playback failed"));
  };

  const submitScore = async (n: number) => {
    if (!user || !current) return;
    if (listened < MIN_LISTEN_MS) {
      toast.error("Listen at least 60 seconds before scoring");
      return;
    }
    const { error } = await supabase.from("track_scores").insert({
      track_id: current.id, judge_id: user.id, score: n,
    });
    if (error) {
      if (error.message.includes("duplicate")) toast.message("Already scored today");
      else toast.error(error.message);
    } else {
      toast.success(`Anonymous ${n}/10 locked in 🔒`);
      // burn one boost vote credit if track is boosted
      if (current.is_boosted) await supabase.rpc("consume_boost_vote", { _track_id: current.id });
      setScored((s) => new Set(s).add(current.id));
    }
    if (idx < tracks.length - 1) setIdx(idx + 1);
  };

  const next = () => { if (idx < tracks.length - 1) setIdx(idx + 1); };

  const value = useMemo(() => ({ open: startSession }), [startSession]);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const listenSec = Math.floor(listened / 1000);
  const canScore = listened >= MIN_LISTEN_MS;
  const alreadyScored = current ? scored.has(current.id) : false;

  return (
    <JudgingCtx.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={(v) => !v && closeSession()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" /> Anonymous Judging
              <span className="ml-auto font-display text-2xl text-accent">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
            </DialogTitle>
            <DialogDescription>
              10-minute session. Listen ≥ 60s, then drop a private score 1–10. Boosted tracks first.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /></div>
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
                    className={`h-full transition-all ${canScore ? "bg-primary" : "bg-accent"}`}
                    style={{ width: `${Math.min(100, (listened / MIN_LISTEN_MS) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{listenSec}s listened</span>
                  <span>{canScore ? "Score unlocked ✓" : "60s to unlock"}</span>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-1 mt-3">
                {Array.from({ length: 10 }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <button
                      key={n}
                      onClick={() => submitScore(n)}
                      disabled={!canScore || alreadyScored}
                      className="h-10 rounded-md border border-border bg-card text-xs font-bold hover:border-primary disabled:opacity-40"
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3">
                <Link to="/pricing" className="text-[10px] tracking-widest text-primary font-bold inline-flex items-center gap-1">
                  <Star className="h-3 w-3" /> BOOST YOUR TRACK
                </Link>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={next} disabled={idx >= tracks.length - 1}>Skip</Button>
                  <Button size="sm" variant="ghost" onClick={closeSession}>
                    <Lock className="h-3 w-3 mr-1" /> Close
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
