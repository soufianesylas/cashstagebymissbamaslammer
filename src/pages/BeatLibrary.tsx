import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Music2, Pause, Play, Search as SearchIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";

interface Beat {
  id: string;
  producer_id: string;
  title: string;
  audio_path: string;
  bpm: number | null;
  vibe: string | null;
  approved: boolean;
  created_at: string;
}

const BeatLibrary = () => {
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [vibeFilter, setVibeFilter] = useState("");
  const [showMine, setShowMine] = useState(false);

  // upload form
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [vibe, setVibe] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contest_beats")
      .select("id, producer_id, title, audio_path, bpm, vibe, approved, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setBeats(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return beats.filter((b) => {
      if (showMine && b.producer_id !== user?.id) return false;
      if (query && !b.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (vibeFilter && (b.vibe ?? "").toLowerCase() !== vibeFilter.toLowerCase()) return false;
      return true;
    });
  }, [beats, query, vibeFilter, showMine, user?.id]);

  const vibes = useMemo(() => {
    const s = new Set<string>();
    beats.forEach((b) => b.vibe && s.add(b.vibe));
    return Array.from(s).sort();
  }, [beats]);

  const getSignedUrl = async (path: string) => {
    if (signedUrls[path]) return signedUrls[path];
    const { data, error } = await supabase.storage.from("tracks").createSignedUrl(path, 60 * 60);
    if (error || !data) {
      toast.error("Could not load preview");
      return null;
    }
    setSignedUrls((s) => ({ ...s, [path]: data.signedUrl }));
    return data.signedUrl;
  };

  const togglePlay = async (beat: Beat) => {
    if (playingId === beat.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    const url = await getSignedUrl(beat.audio_path);
    if (!url) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.onended = () => setPlayingId(null);
    try {
      await audioRef.current.play();
      setPlayingId(beat.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Playback failed");
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to upload beats");
      return;
    }
    if (!file || !title.trim()) {
      toast.error("Add a title and audio file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Beat is too large (max 50MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${user.id}/beats/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tracks")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("contest_beats").insert({
        producer_id: user.id,
        title: title.trim(),
        audio_path: path,
        bpm: bpm ? parseInt(bpm, 10) : null,
        vibe: vibe.trim() || null,
      });
      if (insErr) throw insErr;
      toast.success("Beat uploaded — pending approval");
      setTitle("");
      setBpm("");
      setVibe("");
      setFile(null);
      (document.getElementById("beat-file-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("beat-file-input") as HTMLInputElement).value = "");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Beat Library — Cash Stage"
        description="Upload beats, browse the producer catalog, and preview before you flow."
      />
      <SiteNav />
      <main className="container pt-24 pb-16">
        <header className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">Beat Library</h1>
          <p className="text-muted-foreground mt-2">
            Upload your beats, browse the catalog, and preview before you flow.
          </p>
        </header>

        {/* Upload */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-6 mb-10">
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" /> Drop a beat
          </h2>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="vibe">Vibe</Label>
              <Input id="vibe" value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="trap, boom-bap, drill…" maxLength={40} />
            </div>
            <div>
              <Label htmlFor="bpm">BPM</Label>
              <Input id="bpm" type="number" min={40} max={240} value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="beat-file-input">Audio file (mp3 / wav, max 50MB)</Label>
              <Input
                id="beat-file-input"
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Submit beat
              </Button>
            </div>
          </form>
        </section>

        {/* Search */}
        <section className="mb-6 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title…"
              className="pl-9"
            />
          </div>
          <select
            value={vibeFilter}
            onChange={(e) => setVibeFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All vibes</option>
            {vibes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant={showMine ? "default" : "secondary"}
            onClick={() => setShowMine((s) => !s)}
          >
            {showMine ? "Showing my beats" : "All beats"}
          </Button>
        </section>

        {/* List */}
        <section className="grid gap-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading beats…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No beats yet — be the first to drop one.</p>
          ) : (
            filtered.map((b) => {
              const isPlaying = playingId === b.id;
              const mine = b.producer_id === user?.id;
              return (
                <article
                  key={b.id}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/30 p-4"
                >
                  <Button
                    type="button"
                    size="icon"
                    variant={isPlaying ? "default" : "secondary"}
                    onClick={() => togglePlay(b)}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h3 className="font-semibold truncate">{b.title}</h3>
                      {!b.approved && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {mine ? "Pending" : "Unapproved"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                      {b.bpm && <span>{b.bpm} BPM</span>}
                      {b.vibe && <span>{b.vibe}</span>}
                      <span>{new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};

export default BeatLibrary;
