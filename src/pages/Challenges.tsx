import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Ticket, Trophy, Share2, Loader2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  kind: string;
  genre: string | null;
  ticket_price_cents: number;
  pot_cents: number;
  max_entries: number;
  status: string;
  ends_at: string;
}
interface Entry {
  id: string;
  challenge_id: string;
  user_id: string;
  track_id: string;
  share_code: string;
  share_count: number;
}
interface Track { id: string; title: string }
interface RankRow { track_id: string; user_id: string; title: string; plays: number; avg_score: number; votes: number }

const GENRES = ["Hip-Hop", "Rap", "Trap", "Country Rap", "Country", "Alternative", "Any"];
const KINDS = ["solo", "collab", "battle", "cypher"];
const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tickets, setTickets] = useState<Record<string, number>>({});
  const [myTracks, setMyTracks] = useState<Track[]>([]);
  const [ranks, setRanks] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("solo");
  const [genre, setGenre] = useState("Hip-Hop");
  const [creating, setCreating] = useState(false);
  const [trackPick, setTrackPick] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: e }, { data: t }, { data: r }, { data: myTix }] = await Promise.all([
      supabase.from("challenges").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("challenge_entries").select("id,challenge_id,user_id,track_id,share_code,share_count"),
      user
        ? supabase.from("tracks").select("id,title").eq("user_id", user.id).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Track[] }),
      (supabase.rpc as any)("daily_solo_rank"),
      user
        ? supabase.from("rally_tickets").select("challenge_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setChallenges((c as any) ?? []);
    setEntries((e as any) ?? []);
    setMyTracks((t as any) ?? []);
    setRanks(((r as any) ?? []).slice(0, 10));
    const counts: Record<string, number> = {};
    ((myTix as any) ?? []).forEach((row: any) => {
      counts[row.challenge_id] = (counts[row.challenge_id] ?? 0) + 1;
    });
    setTickets(counts);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const create = async () => {
    if (!user) return toast.error("Sign in first");
    if (!title.trim()) return toast.error("Give the challenge a title");
    setCreating(true);
    const { error } = await supabase.from("challenges").insert({
      creator_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      kind,
      genre: genre === "Any" ? null : genre,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Challenge posted");
    setOpen(false); setTitle(""); setDescription("");
    load();
  };

  const buyTicket = async (c: Challenge) => {
    if (!user) return toast.error("Sign in first");
    setBusy(`t-${c.id}`);
    const { error } = await supabase.from("rally_tickets").insert({
      challenge_id: c.id,
      user_id: user.id,
      amount_cents: c.ticket_price_cents,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Rally ticket in — ${usd(c.ticket_price_cents)} added to the pot`);
    load();
  };

  const enterTrack = async (c: Challenge) => {
    if (!user) return toast.error("Sign in first");
    const trackId = trackPick[c.id];
    if (!trackId) return toast.error("Pick one of your tracks first");
    setBusy(`e-${c.id}`);
    const { error } = await supabase.from("challenge_entries").insert({
      challenge_id: c.id,
      user_id: user.id,
      track_id: trackId,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Track entered");
    load();
  };

  const share = async (entry: Entry, c: Challenge) => {
    const url = `${window.location.origin}/challenges?e=${entry.share_code}`;
    try {
      if (navigator.share) await navigator.share({ title: c.title, text: `Vote on my entry in ${c.title}`, url });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch { /* user cancelled */ }
    const { error } = await (supabase.rpc as any)("bump_entry_share", { _entry_id: entry.id });
    if (!error) load();
  };

  const entriesFor = (id: string) => entries.filter((e) => e.challenge_id === id);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEO
        title="Challenges & Daily Rank Prizes — Cash Stage"
        description="Create a challenge, buy $2 rally tickets to grow the pot, enter your track and track the daily rank prize board."
        path="/challenges"
      />
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg">CHALLENGES</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a challenge</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Challenge title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
                <Textarea placeholder="Rules / description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Rally tickets are $2 each and go straight into the posted pot. Winner takes half.
                </p>
                <Button className="w-full" onClick={create} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Post challenge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Daily rank prize board */}
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <p className="font-display text-lg">Daily Rank Prize Board</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Hold the #1 solo spot and earn $5 for every day you keep it. Collab, battle and cypher #1 spots start at $8 a day.
          </p>
          <div className="mt-3 space-y-1">
            {ranks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No ranked tracks scored yet today.</p>
            ) : ranks.map((r, i) => (
              <div key={r.track_id} className="flex items-center gap-3 rounded-lg bg-secondary/70 px-3 py-2">
                <span className={`font-display text-lg w-6 ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.avg_score} avg · {r.votes} anonymous votes · {r.plays} plays</p>
                </div>
                <span className={`font-display text-sm ${i === 0 ? "text-accent" : "text-muted-foreground"}`}>
                  {i === 0 ? "$5/day" : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /></div>
        ) : challenges.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Music2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-bold">No challenges yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create the first one and let the pot build.</p>
          </div>
        ) : (
          challenges.map((c) => {
            const list = entriesFor(c.id);
            const mine = list.find((e) => e.user_id === user?.id);
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.kind.toUpperCase()} · {c.genre ?? "Any genre"} · {list.length}/{c.max_entries} entries · ends{" "}
                      {new Date(c.ends_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground tracking-widest">POT</p>
                    <p className="font-display text-2xl text-accent">{usd(c.pot_cents)}</p>
                  </div>
                </div>
                {c.description && <p className="text-sm text-foreground/90">{c.description}</p>}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="gap-1" onClick={() => buyTicket(c)} disabled={busy === `t-${c.id}`}>
                    {busy === `t-${c.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                    Rally ticket {usd(c.ticket_price_cents)}
                  </Button>
                  {mine ? (
                    <Button variant="outline" className="gap-1" onClick={() => share(mine, c)}>
                      <Share2 className="h-4 w-4" /> Share ({mine.share_count})
                    </Button>
                  ) : (
                    <Button className="gap-1" onClick={() => enterTrack(c)} disabled={busy === `e-${c.id}`}>
                      {busy === `e-${c.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter track"}
                    </Button>
                  )}
                </div>

                {!mine && (
                  <Select value={trackPick[c.id] ?? ""} onValueChange={(v) => setTrackPick((p) => ({ ...p, [c.id]: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={myTracks.length ? "Pick a track to enter" : "Record a track in the Studio first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {myTracks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Your tickets here: {tickets[c.id] ?? 0} · Winner takes half the pot ({usd(Math.floor(c.pot_cents / 2))})
                </p>
              </div>
            );
          })
        )}

        <p className="text-center text-[10px] text-muted-foreground pt-2">
          🔒 Judging stays anonymous. Battles are 18+ only. Drama free everywhere else.
        </p>
      </div>
    </div>
  );
}
