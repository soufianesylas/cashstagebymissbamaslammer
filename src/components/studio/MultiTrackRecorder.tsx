import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2, Volume2, VolumeX, Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { encodeWav, decodeToAudioBuffer } from "@/lib/wavEncoder";
import type { FreeBeat } from "@/data/freeBeats";

interface Layer {
  id: string;
  name: string;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  duration: number;
}

interface Props {
  beat: FreeBeat | null;
  beatVolume: number;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const MultiTrackRecorder = ({ beat, beatVolume }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [title, setTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [mixing, setMixing] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const beatElRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  };

  const stopPlayback = () => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    sourcesRef.current = [];
    if (beatElRef.current) { beatElRef.current.pause(); beatElRef.current.currentTime = 0; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPlaying(false);
    setElapsed(0);
  };

  useEffect(() => () => {
    stopPlayback();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
  }, []);

  const playLayers = (ctx: AudioContext, destination?: AudioNode) => {
    layers.forEach((l) => {
      if (l.muted) return;
      const src = ctx.createBufferSource();
      src.buffer = l.buffer;
      const g = ctx.createGain();
      g.gain.value = l.volume;
      src.connect(g);
      g.connect(ctx.destination); // artist hears playback
      if (destination) g.connect(destination);
      src.start();
      sourcesRef.current.push(src);
    });
  };

  const playBeat = (ctx: AudioContext, destination?: AudioNode) => {
    if (!beat) return null;
    const el = new Audio(beat.url);
    el.crossOrigin = "anonymous";
    el.loop = false;
    beatElRef.current = el;
    const src = ctx.createMediaElementSource(el);
    const g = ctx.createGain();
    g.gain.value = beatVolume;
    src.connect(g);
    g.connect(ctx.destination);
    if (destination) g.connect(destination);
    el.play().catch(() => {});
    return el;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const ctx = getCtx();
      await ctx.resume();

      const dest = ctx.createMediaStreamDestination();
      const micSrc = ctx.createMediaStreamSource(stream);
      micSrc.connect(dest);

      // Play existing layers + beat into monitors and into recording destination
      playLayers(ctx, dest);
      playBeat(ctx, dest);

      // Record only the mic — layers/beat stay clean and are mixed on export
      const micOnlyDest = ctx.createMediaStreamDestination();
      micSrc.connect(micOnlyDest);

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(micOnlyDest.stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        try {
          const buf = await decodeToAudioBuffer(blob, ctx);
          setLayers((L) => [
            ...L,
            {
              id: crypto.randomUUID(),
              name: `Layer ${L.length + 1}`,
              buffer: buf,
              volume: 1,
              muted: false,
              duration: buf.duration,
            },
          ]);
          toast.success("Layer captured");
        } catch (e: any) {
          toast.error("Could not decode layer: " + (e?.message ?? "unknown"));
        }
      };
      rec.start(250);
      recRef.current = rec;

      startRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(
        () => setElapsed((Date.now() - startRef.current) / 1000),
        100
      );
      setRecording(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Microphone access denied");
    }
  };

  const stopRecording = () => {
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopPlayback();
    setRecording(false);
  };

  const togglePlayAll = async () => {
    if (playing) { stopPlayback(); return; }
    if (!layers.length && !beat) return;
    const ctx = getCtx();
    await ctx.resume();
    playLayers(ctx);
    playBeat(ctx);
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = window.setInterval(
      () => setElapsed((Date.now() - startRef.current) / 1000),
      100
    );
    setPlaying(true);
    const maxDur = Math.max(0, ...layers.map((l) => l.duration));
    window.setTimeout(() => { if (playing || sourcesRef.current.length) stopPlayback(); }, (maxDur + 0.3) * 1000);
  };

  const removeLayer = (id: string) => setLayers((L) => L.filter((l) => l.id !== id));
  const updateLayer = (id: string, patch: Partial<Layer>) =>
    setLayers((L) => L.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const mixdown = async (): Promise<AudioBuffer> => {
    const sampleRate = 44100;
    // Include beat length if selected
    let beatBuf: AudioBuffer | null = null;
    if (beat) {
      const resp = await fetch(beat.url);
      const blob = await resp.blob();
      beatBuf = await decodeToAudioBuffer(blob);
    }
    const maxDur = Math.max(
      ...layers.map((l) => l.duration),
      beatBuf?.duration ?? 0,
      1
    );
    const off = new OfflineAudioContext(2, Math.ceil(maxDur * sampleRate), sampleRate);
    layers.forEach((l) => {
      if (l.muted) return;
      const src = off.createBufferSource();
      src.buffer = l.buffer;
      const g = off.createGain();
      g.gain.value = l.volume;
      src.connect(g).connect(off.destination);
      src.start();
    });
    if (beatBuf) {
      const src = off.createBufferSource();
      src.buffer = beatBuf;
      const g = off.createGain();
      g.gain.value = beatVolume;
      src.connect(g).connect(off.destination);
      src.start();
    }
    return off.startRendering();
  };

  const publish = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    if (!layers.length) { toast.error("Record at least one layer"); return; }
    if (title.trim().length < 2) { toast.error("Give it a title (2+ chars)"); return; }
    setPublishing(true);
    setMixing(true);
    try {
      const mixed = await mixdown();
      setMixing(false);
      const wav = encodeWav(mixed);
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const path = `${user.id}/${Date.now()}-${slug}.wav`;
      const { error: upErr } = await supabase.storage
        .from("tracks")
        .upload(path, wav, { contentType: "audio/wav", upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("tracks").insert({
        user_id: user.id,
        title: title.trim(),
        mode: "solo",
        audio_path: path,
        duration_seconds: Math.round(mixed.duration),
      });
      if (insErr) throw insErr;
      toast.success("Dropped to the feed 🔥");
      setTitle("");
      setLayers([]);
      navigate("/app?tab=feed");
    } catch (e: any) {
      toast.error(e?.message ?? "Publish failed");
    } finally {
      setPublishing(false);
      setMixing(false);
    }
  };

  return (
    <section className="mt-10 rounded-3xl border border-accent/40 p-6 bg-card/60">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-accent font-bold flex items-center gap-1">
            <Layers className="h-3 w-3" /> MULTI-TRACK STUDIO
          </p>
          <h2 className="font-display text-3xl mt-1">STACK YOUR LAYERS</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Record vocals → hook → ad-libs → harmonies. Each pass plays back while you record the next.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tabular-nums">{fmt(elapsed)}</p>
          <p className="text-[10px] text-muted-foreground tracking-widest">
            {recording ? "RECORDING" : playing ? "PLAYING" : `${layers.length} LAYERS`}
          </p>
        </div>
      </div>

      {/* Transport */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={publishing}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            {layers.length ? "RECORD NEW LAYER" : "RECORD FIRST LAYER"}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm inline-flex items-center gap-2"
          >
            <Square className="h-4 w-4 fill-current" /> STOP LAYER
          </button>
        )}
        <button
          onClick={togglePlayAll}
          disabled={recording || (!layers.length && !beat) || publishing}
          className="px-4 py-3 rounded-xl bg-secondary border border-border font-bold text-sm inline-flex items-center gap-2 disabled:opacity-40"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          {playing ? "STOP" : "PLAY MIX"}
        </button>
        <button
          onClick={() => { stopPlayback(); setLayers([]); }}
          disabled={!layers.length || recording || publishing}
          className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm inline-flex items-center gap-2 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> CLEAR ALL
        </button>
      </div>

      {/* Layers */}
      {layers.length > 0 && (
        <div className="mt-6 space-y-2">
          {layers.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border">
              <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
              <input
                value={l.name}
                onChange={(e) => updateLayer(l.id, { name: e.target.value })}
                className="bg-transparent flex-1 min-w-0 text-sm font-semibold outline-none border-b border-transparent focus:border-primary/40"
              />
              <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right">{fmt(l.duration)}</span>
              <button
                onClick={() => updateLayer(l.id, { muted: !l.muted })}
                className={`h-8 w-8 grid place-items-center rounded-lg border ${l.muted ? "bg-destructive/20 border-destructive/50" : "bg-background border-border"}`}
                aria-label={l.muted ? "Unmute" : "Mute"}
              >
                {l.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={l.volume}
                onChange={(e) => updateLayer(l.id, { volume: parseFloat(e.target.value) })}
                className="w-24 accent-primary"
              />
              <button
                onClick={() => removeLayer(l.id)}
                className="h-8 w-8 grid place-items-center rounded-lg bg-background border border-border hover:border-destructive hover:text-destructive"
                aria-label="Delete layer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Publish */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track title — e.g. Bama Anthem"
          maxLength={80}
          className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm outline-none focus:border-primary"
        />
        <button
          onClick={publish}
          disabled={publishing || recording || !layers.length}
          className="px-5 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {mixing ? "MIXING…" : publishing ? "PUBLISHING…" : "PUBLISH AS SOLO DROP"}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        All layers mix down to a single WAV with the beat baked in and post to the public feed.
      </p>
    </section>
  );
};

export default MultiTrackRecorder;
