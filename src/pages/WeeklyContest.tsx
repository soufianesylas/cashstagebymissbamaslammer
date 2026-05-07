import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Trophy, Lock, Loader2, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Tier = "free" | "platinum" | "vip";
type Contest = {
  id: string; week_start: string; status: string; prize_usd_cents: number;
  submissions_open_at: string; submissions_close_at: string;
};
type Track = { id: string; title: string };
type Entry = { id: string; user_id: string; track_id: string; contest_id: string };

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(0)}`;
const isoWeekKey = (d: string) => {
  const date = new Date(d);
  const onejan = new Date(date.getFullYear(), 0, 1);
  return `${date.getFullYear()}-W${Math.ceil(((+date - +onejan) / 86400000 + onejan.getDay() + 1) / 7)}`;
};

const WeeklyContest = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("free");
  const [contests, setContests] = useState<Contest[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [paywall, setPaywall] = useState<{ open: boolean; reason: string }>({ open: false, reason: "" });
  const [submitFor, setSubmitFor] = useState<Contest | null>(null);
  const [pickedTrack, setPickedTrack] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: subs }, { data: cs }] = await Promise.all([
      user ? supabase.from("subscriptions").select("tier").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }) as any,
      supabase.from("weekly_contests").select("*").order("week_start", { ascending: false }).limit(8),
    ]);
    setTier((subs?.tier as Tier) ?? "free");
    setContests((cs ?? []) as Contest[]);
    if (user) {
      const [{ data: ts }, { data: es }] = await Promise.all([
        supabase.from("tracks").select("id,title").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("weekly_contest_entries").select("*").eq("user_id", user.id),
      ]);
      setTracks((ts ?? []) as Track[]);
      setMyEntries((es ?? []) as Entry[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const entriesThisWeekByContestWeek = useMemo(() => {
    const map = new Map<string, number>();
    myEntries.forEach((e) => {
      const c = contests.find((x) => x.id === e.contest_id);
      if (!c) return;
      const k = isoWeekKey(c.week_start);
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [myEntries, contests]);

  const tryEnter = (c: Contest) => {
    if (!user) { toast.error("Sign in first"); return; }
    if (c.status !== "submissions") { toast.error("Submissions are closed"); return; }
    const alreadyInThisContest = myEntries.some((e) => e.contest_id === c.id);
    if (alreadyInThisContest) { toast.error("You've already entered this contest"); return; }

    if (tier === "free") {
      const used = entriesThisWeekByContestWeek.get(isoWeekKey(c.week_start)) ?? 0;
      // also block if any entry exists in current ISO week across contests
      const usedAnywhere = myEntries.filter((e) => {
        const cc = contests.find((x) => x.id === e.contest_id);
        return cc && isoWeekKey(cc.week_start) === isoWeekKey(c.week_start);
      }).length;
      if (used >= 1 || usedAnywhere >= 1) {
        setPaywall({
          open: true,
          reason: "Free accounts get one weekly contest entry per week. You've already used it for this week — upgrade to Platinum or VIP for unlimited weekly entries.",
        });
        return;
      }
    }
    if (tracks.length === 0) {
      toast.error("Record or upload a track first in the Studio");
      return;
    }
    setSubmitFor(c);
    setPickedTrack(tracks[0]?.id ?? "");
  };

  const submit = async () => {
    if (!submitFor || !pickedTrack || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("weekly_contest_entries").insert({
      contest_id: submitFor.id, user_id: user.id, track_id: pickedTrack,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes("free accounts")) {
        setPaywall({ open: true, reason: error.message });
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Entry submitted 🔥");
    setSubmitFor(null); setPickedTrack("");
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Weekly Contest</p>
          <Link to="/pricing" className="text-[10px] tracking-widest text-primary font-bold">UPGRADE</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl border border-primary/30 p-4 bg-primary/5">
          <p className="text-[10px] tracking-widest text-primary font-bold">YOUR PLAN</p>
          <p className="font-display text-2xl mt-1 capitalize">{tier}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tier === "free"
              ? "Free: 1 weekly contest entry per week."
              : "Unlimited weekly entries."}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : contests.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No weekly contests yet. Check back soon.</p>
        ) : (
          contests.map((c) => {
            const entered = myEntries.some((e) => e.contest_id === c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-xl flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-accent" /> Week of {new Date(c.week_start).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground tracking-widest mt-1">
                      {c.status.toUpperCase()} · PRIZE {fmtUsd(c.prize_usd_cents)}
                    </p>
                  </div>
                  {entered ? (
                    <span className="text-[10px] text-primary font-bold">ENTERED</span>
                  ) : (
                    <Button size="sm" onClick={() => tryEnter(c)} disabled={c.status !== "submissions"}>
                      Enter
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paywall */}
      <Dialog open={paywall.open} onOpenChange={(v) => setPaywall({ ...paywall, open: v })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Upgrade to keep entering
            </DialogTitle>
            <DialogDescription>{paywall.reason}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 my-2">
            <div className="rounded-xl border border-primary/40 p-3 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-display mt-1">Platinum</p>
              <p className="text-[11px] text-muted-foreground">$15/mo · unlimited entries</p>
            </div>
            <div className="rounded-xl border border-accent/40 p-3 bg-accent/5">
              <Crown className="h-4 w-4 text-accent" />
              <p className="font-display mt-1">VIP</p>
              <p className="text-[11px] text-muted-foreground">$20/mo · front of line</p>
            </div>
          </div>
          <DialogFooter>
            <Link to="/pricing" className="w-full">
              <Button className="w-full">See Plans</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pick a track */}
      <Dialog open={!!submitFor} onOpenChange={(v) => !v && setSubmitFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick a track to enter</DialogTitle>
            <DialogDescription>Only your own tracks can be entered.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-2 max-h-72 overflow-y-auto">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setPickedTrack(t.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  pickedTrack === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <p className="font-bold truncate">{t.title}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!pickedTrack || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklyContest;
