import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Play, Pause, Trophy, Music2, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Contest = {
  id: string;
  contest_date: string;
  status: "open" | "voting" | "closed";
  winner_beat_id: string | null;
};

type Entry = {
  id: string;
  contest_id: string;
  beat_id: string;
  slot: number;
  beat?: { id: string; title: string; bpm: number | null; vibe: string | null; audio_path: string; signed_url?: string };
  votes: number;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// Next contest = next weekday (Mon-Fri) at 00:00 local
const nextContestDate = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0); // tomorrow midnight
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};

const useCountdown = (target: Date) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

import { signedTrackUrls } from "@/lib/storage";

const BeatOfTheDay = () => {
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myVoteEntry, setMyVoteEntry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const target = useMemo(() => nextContestDate(), []);
  const countdown = useCountdown(target);

  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: c } = await supabase
      .from("daily_contests")
      .select("*")
      .eq("contest_date", todayISO())
      .maybeSingle();

    if (!c) {
      setContest(null);
      setEntries([]);
      setLoading(false);
      return;
    }
    setContest(c as Contest);

    const { data: ents } = await supabase
      .from("contest_entries")
      .select("id, contest_id, beat_id, slot, contest_beats(id,title,bpm,vibe,audio_path)")
      .eq("contest_id", c.id)
      .order("slot");

    const { data: tallies } = await supabase
      .from("contest_vote_tallies")
      .select("entry_id, vote_count")
      .eq("contest_id", c.id);

    const tallyMap = new Map((tallies ?? []).map((t: any) => [t.entry_id, t.vote_count]));
    const urlMap = await signedTrackUrls((ents ?? []).map((e: any) => e.contest_beats?.audio_path).filter(Boolean));
    setEntries(
      (ents ?? []).map((e: any) => ({
        id: e.id,
        contest_id: e.contest_id,
        beat_id: e.beat_id,
        slot: e.slot,
        beat: e.contest_beats ? { ...e.contest_beats, signed_url: urlMap.get(e.contest_beats.audio_path) ?? "" } : undefined,
        votes: tallyMap.get(e.id) ?? 0,
      }))
    );

    if (user) {
      const { data: mine } = await supabase
        .from("contest_votes")
        .select("entry_id")
        .eq("contest_id", c.id)
        .eq("voter_id", user.id)
        .maybeSingle();
      setMyVoteEntry(mine?.entry_id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("beat-of-the-day")
      .on("postgres_changes", { event: "*", schema: "public", table: "contest_votes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_contests" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const togglePlay = (entryId: string, signedUrl: string) => {
    if (audioRef.current && playingId === entryId) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    if (!signedUrl) { toast.error("Beat unavailable"); return; }
    const a = new Audio(signedUrl);
    audioRef.current = a;
    a.onended = () => setPlayingId(null);
    a.play().catch(() => toast.error("Could not play beat"));
    setPlayingId(entryId);
  };

  const vote = async (entry: Entry) => {
    if (!user) {
      toast.error("Sign in to vote");
      return;
    }
    if (myVoteEntry) {
      toast.error("You already voted today");
      return;
    }
    if (!contest || contest.status === "closed") {
      toast.error("Voting is closed");
      return;
    }
    const { error } = await supabase.from("contest_votes").insert({
      contest_id: contest.id,
      entry_id: entry.id,
      voter_id: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyVoteEntry(entry.id);
    toast.success("Anonymous vote locked in 🔒");
  };

  const totalVotes = entries.reduce((a, b) => a + b.votes, 0);
  const leader = entries.reduce<Entry | null>((m, e) => (!m || e.votes > m.votes ? e : m), null);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground tracking-widest">BEAT OF THE DAY</p>
            <p className="font-display text-lg leading-none">{new Date().toLocaleDateString(undefined, { weekday: "long" })}</p>
          </div>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Status banner */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground tracking-widest">NEXT CONTEST IN</p>
              <p className="font-display text-3xl text-accent">{countdown}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground tracking-widest">TODAY</p>
              <p className="text-sm font-semibold">
                {isWeekend
                  ? "No contest (weekend)"
                  : !contest
                  ? "Not yet posted"
                  : contest.status === "open"
                  ? "Submissions open"
                  : contest.status === "voting"
                  ? "Voting live"
                  : "Closed"}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-secondary p-2">
              <p className="text-[10px] text-muted-foreground">PICKS</p>
              <p className="font-display text-lg">{entries.length}/30</p>
            </div>
            <div className="rounded-lg bg-secondary p-2">
              <p className="text-[10px] text-muted-foreground">VOTES</p>
              <p className="font-display text-lg">{totalVotes}</p>
            </div>
            <div className="rounded-lg bg-secondary p-2">
              <p className="text-[10px] text-muted-foreground">YOUR VOTE</p>
              <p className="font-display text-lg">
                {myVoteEntry ? <CheckCircle2 className="h-5 w-5 mx-auto text-primary" /> : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Leader card */}
        {leader && totalVotes > 0 && (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-accent" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-accent tracking-widest">CURRENT LEADER</p>
              <p className="font-bold truncate">{leader.beat?.title}</p>
            </div>
            <p className="font-display text-xl text-accent">{leader.votes}</p>
          </div>
        )}

        {/* Entries */}
        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : !contest ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Music2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-bold">No contest posted yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Directors haven't dropped today's 30 picks. Check back soon.
            </p>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Awaiting director picks…</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground tracking-widest px-1">
              VOTE ANONYMOUSLY · ONE PICK PER DAY
            </p>
            {entries.map((e) => {
              const mine = myVoteEntry === e.id;
              const locked = !!myVoteEntry || contest.status === "closed";
              const pct = totalVotes ? Math.round((e.votes / totalVotes) * 100) : 0;
              return (
                <div
                  key={e.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    mine ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => e.beat && togglePlay(e.id, e.beat.signed_url ?? "")}
                      className="h-10 w-10 grid place-items-center rounded-full bg-secondary shrink-0"
                    >
                      {playingId === e.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground">#{e.slot}</span>
                        <p className="text-sm font-bold truncate">{e.beat?.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {e.beat?.bpm ? `${e.beat.bpm} BPM` : ""}
                        {e.beat?.bpm && e.beat?.vibe ? " · " : ""}
                        {e.beat?.vibe ?? ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={mine ? "secondary" : "default"}
                      disabled={locked && !mine}
                      onClick={() => vote(e)}
                    >
                      {mine ? (
                        <>
                          <Lock className="h-3 w-3 mr-1" /> Voted
                        </>
                      ) : (
                        "Vote"
                      )}
                    </Button>
                  </div>
                  {/* Anonymous tally bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all ${mine ? "bg-primary" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>{e.votes} votes</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground pt-2">
          🔒 All votes are anonymous. Producers never see who voted for what.
        </p>
      </div>
    </div>
  );
};

export default BeatOfTheDay;
