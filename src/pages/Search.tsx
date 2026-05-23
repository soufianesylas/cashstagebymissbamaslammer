import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Search as SearchIcon, Music, User as UserIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type TrackHit = { id: string; title: string; user_id: string; mode: string; play_count: number; artist_name?: string };
type ArtistHit = { id: string; artist_name: string; avatar_url: string | null };

const useDebounced = <T,>(value: T, delay = 250) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
};

const Search = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<TrackHit[]>([]);
  const [artists, setArtists] = useState<ArtistHit[]>([]);

  useEffect(() => {
    const term = dq.trim();
    if (term.length < 2) { setTracks([]); setArtists([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const like = `%${term.replace(/[%_]/g, "")}%`;
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from("tracks").select("id, title, user_id, mode, play_count").eq("is_hidden", false).ilike("title", like).limit(20),
        supabase.from("profiles").select("id, artist_name, avatar_url").ilike("artist_name", like).limit(20),
      ]);
      if (cancelled) return;
      const trackRows = (t ?? []) as TrackHit[];
      const userIds = Array.from(new Set(trackRows.map((r) => r.user_id)));
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, artist_name").in("id", userIds);
        const nm = new Map((profs ?? []).map((p) => [p.id, p.artist_name as string]));
        trackRows.forEach((r) => (r.artist_name = nm.get(r.user_id) ?? "Unknown"));
      }
      setTracks(trackRows);
      setArtists((a ?? []) as ArtistHit[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dq]);

  const empty = useMemo(() => dq.trim().length >= 2 && !loading && tracks.length === 0 && artists.length === 0, [dq, loading, tracks, artists]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tracks or artists…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
        {dq.trim().length < 2 && (
          <p className="text-center text-sm text-muted-foreground pt-12">Type at least 2 characters to search.</p>
        )}
        {loading && (
          <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        )}
        {empty && <p className="text-center text-sm text-muted-foreground pt-8">No results for "{dq}".</p>}

        {artists.length > 0 && (
          <section>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">ARTISTS</p>
            <div className="space-y-2">
              {artists.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="h-10 w-10 rounded-full bg-secondary grid place-items-center overflow-hidden">
                    {a.avatar_url ? <img src={a.avatar_url} alt={a.artist_name} className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <p className="flex-1 font-bold">{a.artist_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {tracks.length > 0 && (
          <section>
            <p className="text-[10px] text-muted-foreground tracking-widest mb-2">TRACKS</p>
            <div className="space-y-2">
              {tracks.map((t) => (
                <Link key={t.id} to="/app" className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Music className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.artist_name} · {t.mode} · {t.play_count} plays</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Search;
