import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SEO from "@/components/SEO";

interface Boost { id: string; track_id: string; plays_remaining: number; votes_remaining: number; tracks?: { title: string } }

export default function Wheel() {
  const { user } = useAuth();
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<{ won: boolean; partner_id: string | null; new_plays: number; new_votes: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("track_boosts")
      .select("id, track_id, plays_remaining, votes_remaining, tracks!inner(title, user_id)")
      .eq("tracks.user_id", user.id)
      .or("plays_remaining.gt.0,votes_remaining.gt.0")
      .then(({ data }) => setBoosts((data as any) ?? []));
  }, [user?.id]);

  const spin = async () => {
    if (!selected) return toast.error("Pick a boost pack to stake");
    setSpinning(true);
    setResult(null);
    // visual spin: 6 rotations + random landing
    const landing = 360 * 6 + Math.floor(Math.random() * 360);
    setAngle(a => a + landing);

    const { data, error } = await (supabase.rpc as any)("spin_wheel_boost", { _boost_id: selected });
    // Let the wheel animate for ~3s
    setTimeout(() => {
      setSpinning(false);
      if (error) { toast.error(error.message); return; }
      const row = Array.isArray(data) ? data[0] : data;
      setResult(row);
      if (row?.won) toast.success("DOUBLE! Boost doubled.");
      else toast.error("Wiped. Boost is gone.");
      // refresh
      if (user) {
        supabase.from("track_boosts")
          .select("id, track_id, plays_remaining, votes_remaining, tracks!inner(title, user_id)")
          .eq("tracks.user_id", user.id)
          .then(({ data }) => setBoosts((data as any) ?? []));
      }
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <SEO title="Double or Nothing Wheel — Cash Stage" description="Spin the wheel to double your boost pack — or lose it all. Pairs you with a random artist in your genre." path="/wheel" />
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <Link to="/app" className="h-9 w-9 grid place-items-center rounded-full bg-secondary"><ChevronLeft className="h-5 w-5" /></Link>
          <p className="font-display text-lg">Double or Nothing</p>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6 text-center">
        <p className="text-xs text-muted-foreground">
          Stake a boost pack from a contest win. Win → doubles your plays &amp; votes. Lose → forfeit the whole pack. Pairs you with a random artist in your genre.
        </p>

        <div className="relative mx-auto w-64 h-64">
          <div
            className="absolute inset-0 rounded-full border-4 border-primary shadow-2xl transition-transform duration-[3000ms] ease-out"
            style={{
              transform: `rotate(${angle}deg)`,
              background: `conic-gradient(
                hsl(var(--primary)) 0 90deg,
                hsl(var(--destructive)) 90deg 180deg,
                hsl(var(--primary)) 180deg 270deg,
                hsl(var(--destructive)) 270deg 360deg
              )`,
            }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-background grid place-items-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-foreground" />
        </div>

        <div className="text-left space-y-2">
          <p className="text-xs text-muted-foreground tracking-widest">STAKE A BOOST PACK</p>
          {boosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no active boost packs. Win a contest or buy one to spin.</p>
          ) : boosts.map(b => (
            <button
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`w-full p-3 rounded-xl border text-left transition-colors ${selected === b.id ? "border-primary bg-primary/10" : "border-border bg-secondary"}`}
            >
              <p className="font-semibold text-sm truncate">{(b as any).tracks?.title ?? "Untitled"}</p>
              <p className="text-[11px] text-muted-foreground">{b.plays_remaining} plays · {b.votes_remaining} votes remaining</p>
            </button>
          ))}
        </div>

        <Button onClick={spin} disabled={spinning || !selected} className="w-full" size="lg">
          {spinning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Spinning…</> : "SPIN — Double or Nothing"}
        </Button>

        {result && (
          <div className={`rounded-xl p-4 border-2 ${result.won ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"}`}>
            <p className="font-display text-xl">{result.won ? "🎉 DOUBLED" : "💀 WIPED"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {result.won
                ? `Boost is now ${result.new_plays} plays / ${result.new_votes} votes.`
                : "The whole pack is gone. Better luck next spin."}
            </p>
            {result.partner_id && <p className="text-[10px] text-muted-foreground mt-1">Paired partner: {result.partner_id.slice(0, 8)}…</p>}
          </div>
        )}
      </div>
    </div>
  );
}
