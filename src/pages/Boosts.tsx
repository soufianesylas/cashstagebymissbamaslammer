import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Rocket, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { purchase, type Sku } from "@/lib/billing";

type Track = { id: string; title: string };
type Boost = { track_id: string; plays_remaining: number; votes_remaining: number };

const PACKS: { id: Sku; price: string; plays: number; votes: number; label: string }[] = [
  { id: "boost_25", price: "$4.99", plays: 25, votes: 25, label: "Starter Boost" },
  { id: "boost_50", price: "$8.99", plays: 50, votes: 50, label: "Pro Boost" },
];

const Boosts = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ts }, { data: bs }] = await Promise.all([
      supabase.from("tracks").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("track_boosts").select("track_id, plays_remaining, votes_remaining").eq("owner_id", user.id),
    ]);
    setTracks((ts ?? []) as Track[]);
    setBoosts((bs ?? []) as Boost[]);
    if (ts && ts.length && !picked) setPicked(ts[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const buy = async (pack: typeof PACKS[number]) => {
    if (!user || !picked) { toast.error("Pick a track first"); return; }
    setBuying(pack.id);
    const ok = await purchase(pack.id, { trackId: picked });
    setBuying(null);
    if (ok) {
      toast.success(`${pack.label} activated · ${pack.plays} plays + ${pack.votes} votes 🚀`);
      load();
    }
  };

  const totals = boosts.reduce<Record<string, { p: number; v: number }>>((acc, b) => {
    acc[b.track_id] ??= { p: 0, v: 0 };
    acc[b.track_id].p += b.plays_remaining;
    acc[b.track_id].v += b.votes_remaining;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="font-display text-lg">Boost Tracks</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl border border-primary/30 p-4 bg-primary/5">
          <p className="font-display text-xl flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> Send your track first in line
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Boosted tracks float to the top of the live feed and the anonymous judging queue. Real plays, real anonymous votes.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" /></div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Drop a track in the Studio first.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-[10px] tracking-widest text-muted-foreground">PICK A TRACK</p>
              {tracks.map((t) => {
                const tot = totals[t.id];
                const active = picked === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setPicked(t.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      active ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold truncate">{t.title}</p>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    {tot && (tot.p > 0 || tot.v > 0) && (
                      <p className="text-[10px] text-muted-foreground tracking-widest mt-1">
                        ACTIVE: {tot.p} PLAYS · {tot.v} VOTES LEFT
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3">
              {PACKS.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg">{p.label}</p>
                      <p className="text-[10px] tracking-widest text-muted-foreground mt-1">
                        {p.plays} PLAYS · {p.votes} ANONYMOUS VOTES
                      </p>
                    </div>
                    <p className="font-display text-2xl text-accent">{p.price}</p>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    onClick={() => buy(p)}
                    disabled={!picked || buying === p.id}
                  >
                    {buying === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Activate ${p.label}`}
                  </Button>
                </div>
              ))}
              <p className="text-center text-[10px] text-muted-foreground">
                Web preview uses mock checkout. On Android, Google Play Billing handles real payments and receipts are validated server-side.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Boosts;
