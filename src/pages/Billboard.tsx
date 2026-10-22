import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Crown, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

type Row = { id: string; title: string; play_count: number; mode: string; user_id: string; artist: string };
type Range = "week" | "all";

const Billboard = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("week");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("tracks")
        .select("id,title,play_count,mode,user_id,created_at")
        .eq("is_hidden", false)
        .order("play_count", { ascending: false })
        .limit(50);
      if (range === "week") q = q.gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString());
      const { data: tracks } = await q;
      const ids = [...new Set((tracks ?? []).map((t) => t.user_id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,artist_name").in("id", ids)
        : { data: [] as { id: string; artist_name: string }[] };
      const names = new Map((profs ?? []).map((p) => [p.id, p.artist_name]));
      if (!cancelled) {
        setRows((tracks ?? []).map((t) => ({ ...t, artist: names.get(t.user_id) ?? "Artist" })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div className="min-h-screen stage-bg pb-16">
      <SEO title="Top Billboard | Cash Stage" description="The most-played tracks on Cash Stage." />
      <header className="flex items-center gap-3 px-4 pt-5">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-10 w-10 grid place-items-center rounded-full bg-secondary">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl tracking-wide">TOP BILLBOARD</h1>
      </header>
      <div className="flex gap-2 px-4 mt-4">
        {(["week", "all"] as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-full text-[11px] font-bold tracking-widest border ${range === r ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border text-muted-foreground"}`}>
            {r === "week" ? "THIS WEEK" : "ALL TIME"}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-20">No tracks charted yet{range === "week" ? " this week" : ""}.</p>
      ) : (
        <ol className="mt-4 px-4 space-y-2">
          {rows.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/60 border border-border">
              <span className={`w-8 text-center font-display text-xl tabular-nums ${i < 3 ? "text-accent" : "text-muted-foreground"}`}>
                {i === 0 ? <Crown className="h-5 w-5 mx-auto" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">{t.artist} · {t.mode}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{t.play_count.toLocaleString()} plays</span>
              <button onClick={() => navigate(`/drops?track=${t.id}`)} aria-label={`Play ${t.title}`}
                className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-4 w-4 fill-current" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default Billboard;
