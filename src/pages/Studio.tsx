import { useEffect, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Save, Users, Swords, Music, ShieldOff, Loader2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import { useAuth } from "@/hooks/useAuth";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "solo" | "collab" | "battle";

interface Track {
  id: string;
  title: string;
  mode: Mode;
  audio_path: string;
  duration_seconds: number;
  created_at: string;
  audio_url?: string;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const modeMeta: Record<Mode, { label: string; Icon: typeof Mic; color: string }> = {
  solo: { label: "SOLO DROP", Icon: Music, color: "text-accent border-accent/40 bg-accent/10" },
  collab: { label: "COLLAB", Icon: Users, color: "text-battle-blue border-battle-blue/40 bg-battle-blue/10" },
  battle: { label: "BATTLE", Icon: Swords, color: "text-primary border-primary/40 bg-primary/10" },
};

const Studio = () => {
  const { user } = useAuth();
  const recorder = useAudioRecorder();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("solo");
  const [saving, setSaving] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadTracks = async () => {
    if (!user) return;
    setLoadingTracks(true);
    const { data, error } = await supabase
      .from("tracks")
      .select("id, title, mode, audio_path, duration_seconds, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load tracks");
    } else {
      const withUrls = (data ?? []).map((t) => ({
        ...t,
        mode: t.mode as Mode,
        audio_url: supabase.storage.from("tracks").getPublicUrl(t.audio_path).data.publicUrl,
      }));
      setTracks(withUrls);
    }
    setLoadingTracks(false);
  };

  useEffect(() => {
    loadTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSave = async () => {
    if (!user || !recorder.audioBlob) return;
    if (title.trim().length < 2) {
      toast.error("Give the track a title (2+ chars)");
      return;
    }
    setSaving(true);
    try {
      const ext = recorder.audioBlob.type.includes("mp4") ? "m4a" : "webm";
      const path = `${user.id}/${Date.now()}-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tracks")
        .upload(path, recorder.audioBlob, { contentType: recorder.audioBlob.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insertErr } = await supabase.from("tracks").insert({
        user_id: user.id,
        title: title.trim(),
        mode,
        audio_path: path,
        duration_seconds: Math.round(recorder.elapsed),
      });
      if (insertErr) throw insertErr;

      toast.success("Track saved to your stage 🔥");
      setTitle("");
      recorder.reset();
      await loadTracks();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save track");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (track: Track) => {
    if (!confirm(`Delete "${track.title}"?`)) return;
    await supabase.storage.from("tracks").remove([track.audio_path]);
    const { error } = await supabase.from("tracks").delete().eq("id", track.id);
    if (error) toast.error("Could not delete");
    else {
      toast.success("Track deleted");
      loadTracks();
    }
  };

  const isRecording = recorder.state === "recording";
  const isPaused = recorder.state === "paused";
  const hasRecording = recorder.state === "stopped" && recorder.audioBlob;

  return (
    <div className="min-h-screen pt-24 pb-20 stage-bg">
      <SiteNav />
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <p className="text-xs tracking-widest text-primary font-bold">CASH STAGE STUDIO</p>
          <h1 className="font-display text-5xl md:text-7xl mt-2">
            HIT RECORD. <span className="text-gradient-primary">DROP HEAT.</span>
          </h1>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/60 border border-primary/30">
            <ShieldOff className="h-3.5 w-3.5 text-primary" />
            <p className="text-[10px] font-bold tracking-widest text-primary">100% HUMAN · NO AI · RECORDED IN-APP</p>
          </div>
        </div>

        {/* Recorder card */}
        <div className="mt-10 rounded-3xl border border-primary/30 p-8 relative overflow-hidden"
          style={{ background: "radial-gradient(ellipse at center, hsl(150 100% 15% / 0.4), hsl(0 0% 5%) 70%)" }}>
          <div className="absolute -top-20 left-1/4 h-60 w-32 bg-primary/20 blur-3xl animate-spotlight" />
          <div className="absolute -top-20 right-1/4 h-60 w-32 bg-accent/20 blur-3xl animate-spotlight" style={{ animationDelay: "1.2s" }} />

          {/* Waveform */}
          <div className="relative flex items-end justify-center gap-1 h-32">
            {recorder.levels.map((v, i) => (
              <div
                key={i}
                className={`w-2 rounded-full transition-all duration-75 ${
                  isRecording ? "bg-primary glow-primary" : isPaused ? "bg-accent" : "bg-secondary"
                }`}
                style={{ height: `${Math.max(6, v * 100)}%` }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="relative text-center mt-4">
            <p className="font-display text-5xl tabular-nums">
              {formatTime(recorder.elapsed)}
            </p>
            <p className="text-[10px] text-muted-foreground tracking-widest mt-1">
              {isRecording ? "● RECORDING" : isPaused ? "PAUSED" : hasRecording ? "READY TO SAVE" : "READY"}
            </p>
          </div>

          {/* Controls */}
          <div className="relative flex justify-center items-center gap-4 mt-6">
            {recorder.state === "idle" && (
              <button
                onClick={recorder.start}
                className="h-20 w-20 grid place-items-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform glow-primary"
              >
                <Mic className="h-8 w-8" />
              </button>
            )}

            {isRecording && (
              <>
                <button onClick={recorder.pause} className="h-14 w-14 grid place-items-center rounded-full bg-secondary border border-border hover:border-accent">
                  <Pause className="h-5 w-5" />
                </button>
                <button onClick={recorder.stop} className="h-20 w-20 grid place-items-center rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform animate-pulse">
                  <Square className="h-8 w-8 fill-current" />
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button onClick={recorder.resume} className="h-14 w-14 grid place-items-center rounded-full bg-secondary border border-border hover:border-primary">
                  <Mic className="h-5 w-5" />
                </button>
                <button onClick={recorder.stop} className="h-20 w-20 grid place-items-center rounded-full bg-destructive text-destructive-foreground hover:scale-105 transition-transform">
                  <Square className="h-8 w-8 fill-current" />
                </button>
              </>
            )}

            {hasRecording && (
              <button onClick={recorder.reset} className="h-14 w-14 grid place-items-center rounded-full bg-secondary border border-border hover:border-destructive">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {recorder.error && (
            <p className="relative text-center text-destructive text-sm mt-4">
              {recorder.error} — check your browser's mic permission.
            </p>
          )}

          {/* Preview + save */}
          {hasRecording && recorder.audioUrl && (
            <div className="relative mt-8 space-y-4">
              <audio src={recorder.audioUrl} controls className="w-full" />

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track title..."
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(modeMeta) as Mode[]).map((m) => {
                  const meta = modeMeta[m];
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active ? meta.color + " ring-2 ring-current" : "bg-secondary border-border text-muted-foreground"
                      }`}
                    >
                      <meta.Icon className="h-4 w-4 mb-1" />
                      <p className="text-[10px] font-bold">{meta.label}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform glow-primary disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                {saving ? "SAVING..." : "DROP TO STAGE"}
              </button>
            </div>
          )}
        </div>

        {/* My tracks */}
        <div className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-widest text-accent font-bold">YOUR CATALOG</p>
              <h2 className="font-display text-3xl md:text-4xl mt-1">MY TRACKS</h2>
            </div>
            <p className="text-xs text-muted-foreground">{tracks.length} dropped</p>
          </div>

          <div className="mt-6 space-y-3">
            {loadingTracks ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                <Mic className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-display text-xl mt-3">NO BARS YET</p>
                <p className="text-xs text-muted-foreground mt-1">Hit record above to drop your first track.</p>
              </div>
            ) : (
              tracks.map((t) => {
                const meta = modeMeta[t.mode];
                const isPlaying = playingId === t.id;
                return (
                  <div key={t.id} className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 grid place-items-center rounded-xl border ${meta.color}`}>
                        <meta.Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{t.title}</p>
                        <p className="text-[10px] text-muted-foreground tracking-widest">
                          {meta.label} · {formatTime(t.duration_seconds)} · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setPlayingId(isPlaying ? null : t.id)}
                        className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="h-10 w-10 grid place-items-center rounded-full bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {isPlaying && t.audio_url && (
                      <audio src={t.audio_url} controls autoPlay className="w-full mt-3" onEnded={() => setPlayingId(null)} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
