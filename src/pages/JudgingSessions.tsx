import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Gavel, Loader2, Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Session = {
  id: string;
  contest_id: string;
  title: string;
  status: "scheduled" | "open" | "closed";
  opens_at: string;
  closes_at: string;
};

type Entry = { id: string; track_id: string; tracks?: { title: string } };

const JudgingSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [judgeOf, setJudgeOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data: ss } = await supabase
      .from("judging_sessions")
      .select("*")
      .order("opens_at", { ascending: false })
      .limit(20);
    const sessionsList = (ss ?? []) as Session[];
    setSessions(sessionsList);

    if (user && sessionsList.length > 0) {
      const checks = await Promise.all(
        sessionsList.map((s) =>
          (supabase as any).rpc("is_panel_judge", { _session_id: s.id })
        )
      );
      const mine = new Set<string>();
      checks.forEach((r, i) => { if (r.data === true) mine.add(sessionsList[i].id); });
      setJudgeOf(mine);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const openPanel = async (s: Session) => {
    setOpenSession(s);
    const [{ data: ents }, { data: mine }] = await Promise.all([
      supabase
        .from("weekly_contest_entries")
        .select("id, track_id, tracks(title)")
        .eq("contest_id", s.contest_id),
      user
        ? supabase
            .from("judging_scores")
            .select("entry_id, score")
            .eq("session_id", s.id)
            .eq("judge_id", user.id)
        : Promise.resolve({ data: [] as { entry_id: string; score: number }[] }),
    ]);
    setEntries((ents ?? []) as Entry[]);
    const sm: Record<string, number> = {};
    (mine ?? []).forEach((m: { entry_id: string; score: number }) => { sm[m.entry_id] = m.score; });
    setScores(sm);
  };

  const submitScore = async (entryId: string, score: number) => {
    if (!user || !openSession) return;
    setScores((p) => ({ ...p, [entryId]: score }));
    const { error } = await supabase
      .from("judging_scores")
      .upsert({
        session_id: openSession.id,
        entry_id: entryId,
        judge_id: user.id,
        score,
      }, { onConflict: "session_id,entry_id,judge_id" });
    if (error) toast.error(error.message);
    else toast.success(`Scored ${score}/10 (private)`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Judging</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        <div className="rounded-2xl border border-primary/30 p-4 bg-primary/5">
          <p className="font-display text-xl flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> Judging Sessions
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Invited judges score weekly entries 1–10. Scores stay private — only aggregated tallies are shown publicly.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No judging sessions yet.</p>
        ) : openSession ? (
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setOpenSession(null)}>← Back to sessions</Button>
            <p className="font-display text-lg">{openSession.title}</p>
            <p className="text-[10px] tracking-widest text-muted-foreground">
              {openSession.status.toUpperCase()} · CLOSES {new Date(openSession.closes_at).toLocaleString()}
            </p>
            {entries.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No entries to judge yet.</p>
            ) : entries.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-3">
                <p className="font-bold truncate">{e.tracks?.title ?? "Untitled"}</p>
                <div className="grid grid-cols-10 gap-1 mt-2">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const n = i + 1;
                    const active = scores[e.id] === n;
                    return (
                      <button
                        key={n}
                        onClick={() => submitScore(e.id, n)}
                        disabled={openSession.status !== "open" || !judgeOf.has(openSession.id)}
                        className={`h-9 rounded-md border text-xs font-bold transition ${
                          active ? "bg-primary text-primary-foreground border-primary"
                                 : "bg-card text-foreground border-border hover:border-primary"
                        } disabled:opacity-50`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          sessions.map((s) => {
            const isJudge = judgeOf.has(s.id);
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-lg truncate">{s.title}</p>
                    <p className="text-[10px] tracking-widest text-muted-foreground mt-1">
                      {s.status.toUpperCase()} · {new Date(s.opens_at).toLocaleDateString()} → {new Date(s.closes_at).toLocaleDateString()}
                    </p>
                  </div>
                  {isJudge ? (
                    <Button size="sm" onClick={() => openPanel(s)}>
                      <Star className="h-3.5 w-3.5 mr-1" /> Judge
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Invite only
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JudgingSessions;
