import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Upload, Loader2, Volume2, VolumeX, Layers, Music2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { encodeWav, decodeToAudioBuffer } from "@/lib/wavEncoder";
import { encodeMp3, type Mp3Bitrate } from "@/lib/mp3Encoder";
import LayerWaveform from "./LayerWaveform";
import type { FreeBeat } from "@/data/freeBeats";

interface Layer {
  id: string;
  name: string;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  duration: number;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
}

interface Props {
  beat: FreeBeat | null;
  beatVolume: number;
}

type Format = "wav" | "mp3";

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** One click via WebAudio — no sample loading required. */
const scheduleClick = (ctx: AudioContext, time: number, accent = false, dest?: AudioNode) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = accent ? 1600 : 1000;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (dest) gain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.1);
};

const MultiTrackRecorder = ({ beat, beatVolume }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [title, setTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [countingIn, setCountingIn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [mixing, setMixing] = useState(false);

  // Tempo / metronome
  const [bpm, setBpm] = useState(90);
  const [countInBeats, setCountInBeats] = useState(4);
  const [metroDuringRec, setMetroDuringRec] = useState(true);

  // Export
  const [format, setFormat] = useState<Format>("mp3");
  const [bitrate, setBitrate] = useState<Mp3Bitrate>(192);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const beatElRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = new AudioContext();
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

  const playLayer = (ctx: AudioContext, l: Layer, startAt: number, destination?: AudioNode) => {
    const src = ctx.createBufferSource();
    src.buffer = l.buffer;
    const g = ctx.createGain();
    const trimDur = Math.max(0.01, l.trimEnd - l.trimStart);
    const fi = Math.min(l.fadeIn, trimDur);
    const fo = Math.min(l.fadeOut, trimDur);
    // Fade envelope relative to startAt
    g.gain.setValueAtTime(fi > 0 ? 0.0001 : l.volume, startAt);
    if (fi > 0) g.gain.linearRampToValueAtTime(l.volume, startAt + fi);
    if (fo > 0) {
      g.gain.setValueAtTime(l.volume, startAt + trimDur - fo);
      g.gain.linearRampToValueAtTime(0.0001, startAt + trimDur);
    }
    src.connect(g);
    g.connect(ctx.destination);
    if (destination) g.connect(destination);
    src.start(startAt, l.trimStart, trimDur);
    sourcesRef.current.push(src);
  };

  const playAllLayers = (ctx: AudioContext, startAt: number, destination?: AudioNode) => {
    layers.forEach((l) => { if (!l.muted) playLayer(ctx, l, startAt, destination); });
  };

  const playBeat = (ctx: AudioContext, destination?: AudioNode) => {
    if (!beat) return null;
    const el = new Audio(beat.url);
    el.crossOrigin = "anonymous";
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

  const scheduleMetronome = (
    ctx: AudioContext,
    startAt: number,
    beats: number,
    dest?: AudioNode,
    accentFirst = true
  ) => {
    const spb = 60 / bpm;
    for (let i = 0; i < beats; i++) {
      scheduleClick(ctx, startAt + i * spb, accentFirst && i === 0, dest);
    }
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
      // Record only the mic (layers/beat mix at export)
      const micOnlyDest = ctx.createMediaStreamDestination();
      micSrc.connect(micOnlyDest);
      micSrc.connect(dest);

      const spb = 60 / bpm;
      const countInDur = countInBeats * spb;
      const now = ctx.currentTime + 0.1;
      const recordStart = now + countInDur;

      // Count-in clicks — always audible, not into mic bus so they don't record
      if (countInBeats > 0) {
        setCountingIn(true);
        scheduleMetronome(ctx, now, countInBeats, undefined, true);
      }

      // Long metronome during record (optional, monitor only)
      if (metroDuringRec) {
        const maxBeats = Math.ceil((60 * 5) / spb); // up to 5 min
        scheduleMetronome(ctx, recordStart, maxBeats, undefined, false);
      }

      // Start layers + beat exactly on downbeat
      playAllLayers(ctx, recordStart);
      // Beat can't be scheduled sample-accurate via <audio>; align close enough
      setTimeout(() => playBeat(ctx), Math.max(0, (recordStart - ctx.currentTime) * 1000));

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
              trimStart: 0,
              trimEnd: buf.duration,
              fadeIn: 0,
              fadeOut: 0,
            },
          ]);
          toast.success("Layer captured");
        } catch (e: any) {
          toast.error("Could not decode layer: " + (e?.message ?? "unknown"));
        }
      };

      // Delay actual recording until count-in ends
      setTimeout(() => {
        setCountingIn(false);
        rec.start(250);
        startRef.current = Date.now();
        setElapsed(0);
        timerRef.current = window.setInterval(
          () => setElapsed((Date.now() - startRef.current) / 1000),
          100
        );
        setRecording(true);
      }, countInDur * 1000);

      recRef.current = rec;
    } catch (e: any) {
      toast.error(e?.message ?? "Microphone access denied");
    }
  };

  const stopRecording = () => {
    try { recRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stopPlayback();
    setRecording(false);
    setCountingIn(false);
  };

  const togglePlayAll = async () => {
    if (playing) { stopPlayback(); return; }
    if (!layers.length && !beat) return;
    const ctx = getCtx();
    await ctx.resume();
    const startAt = ctx.currentTime + 0.05;
    playAllLayers(ctx, startAt);
    playBeat(ctx);
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = window.setInterval(
      () => setElapsed((Date.now() - startRef.current) / 1000),
      100
    );
    setPlaying(true);
    const maxDur = Math.max(0, ...layers.map((l) => l.trimEnd - l.trimStart));
    window.setTimeout(() => stopPlayback(), (maxDur + 0.4) * 1000);
  };

  const removeLayer = (id: string) => setLayers((L) => L.filter((l) => l.id !== id));
  const updateLayer = (id: string, patch: Partial<Layer>) =>
    setLayers((L) => L.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const mixdown = async (): Promise<AudioBuffer> => {
    const sampleRate = 44100;
    let beatBuf: AudioBuffer | null = null;
    if (beat) {
      const resp = await fetch(beat.url);
      const blob = await resp.blob();
      beatBuf = await decodeToAudioBuffer(blob);
    }
    const layerLens = layers.filter((l) => !l.muted).map((l) => l.trimEnd - l.trimStart);
    const maxDur = Math.max(...layerLens, beatBuf?.duration ?? 0, 1);
    const off = new OfflineAudioContext(2, Math.ceil(maxDur * sampleRate), sampleRate);

    layers.forEach((l) => {
      if (l.muted) return;
      const trimDur = Math.max(0.01, l.trimEnd - l.trimStart);
      const src = off.createBufferSource();
      src.buffer = l.buffer;
      const g = off.createGain();
      const fi = Math.min(l.fadeIn, trimDur);
      const fo = Math.min(l.fadeOut, trimDur);
      g.gain.setValueAtTime(fi > 0 ? 0.0001 : l.volume, 0);
      if (fi > 0) g.gain.linearRampToValueAtTime(l.volume, fi);
      if (fo > 0) {
        g.gain.setValueAtTime(l.volume, trimDur - fo);
        g.gain.linearRampToValueAtTime(0.0001, trimDur);
      }
      src.connect(g).connect(off.destination);
      src.start(0, l.trimStart, trimDur);
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
      const ext = format === "mp3" ? "mp3" : "wav";
      const blob = format === "mp3" ? encodeMp3(mixed, bitrate) : encodeWav(mixed);
      const contentType = format === "mp3" ? "audio/mpeg" : "audio/wav";
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const path = `${user.id}/${Date.now()}-${slug}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tracks")
        .upload(path, blob, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("tracks").insert({
        user_id: user.id,
        title: title.trim(),
        mode: "solo",
        audio_path: path,
        duration_seconds: Math.round(mixed.duration),
      });
      if (insErr) throw insErr;
      toast.success(`Dropped as ${ext.toUpperCase()} 🔥`);
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

  const busy = recording || countingIn || publishing;

  return (
    <section className="mt-10 rounded-3xl border border-accent/40 p-6 bg-card/60">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-accent font-bold flex items-center gap-1">
            <Layers className="h-3 w-3" /> MULTI-TRACK STUDIO
          </p>
          <h2 className="font-display text-3xl mt-1">STACK YOUR LAYERS</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Count-in on tempo, trim &amp; fade each layer, then mix down to WAV or MP3.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tabular-nums">{fmt(elapsed)}</p>
          <p className="text-[10px] text-muted-foreground tracking-widest">
            {countingIn ? "COUNT-IN…" : recording ? "RECORDING" : playing ? "PLAYING" : `${layers.length} LAYERS`}
          </p>
        </div>
      </div>

      {/* Tempo panel */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto_auto] items-center p-3 rounded-xl bg-secondary/60 border border-border">
        <div className="flex items-center gap-2">
          <Music2 className="h-4 w-4 text-accent" />
          <span className="text-xs font-bold tracking-widest">BPM</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range" min={40} max={200} step={1} value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            disabled={busy}
            className="flex-1 accent-primary"
          />
          <input
            type="number" min={40} max={220} value={bpm}
            onChange={(e) => setBpm(Math.max(40, Math.min(220, parseInt(e.target.value) || 90)))}
            disabled={busy}
            className="w-16 px-2 py-1 rounded bg-background border border-border text-sm text-center"
          />
        </div>
        <label className="text-xs flex items-center gap-2">
          Count-in
          <select
            value={countInBeats}
            onChange={(e) => setCountInBeats(parseInt(e.target.value))}
            disabled={busy}
            className="bg-background border border-border rounded px-2 py-1"
          >
            {[0, 2, 4, 8].map((n) => <option key={n} value={n}>{n} beats</option>)}
          </select>
        </label>
        <label className="text-xs flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={metroDuringRec}
            onChange={(e) => setMetroDuringRec(e.target.checked)}
            disabled={busy}
            className="accent-primary"
          />
          Click during rec
        </label>
      </div>

      {/* Transport */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!recording && !countingIn ? (
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
            <Square className="h-4 w-4 fill-current" /> {countingIn ? "CANCEL" : "STOP LAYER"}
          </button>
        )}
        <button
          onClick={togglePlayAll}
          disabled={busy || (!layers.length && !beat)}
          className="px-4 py-3 rounded-xl bg-secondary border border-border font-bold text-sm inline-flex items-center gap-2 disabled:opacity-40"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          {playing ? "STOP" : "PLAY MIX"}
        </button>
        <button
          onClick={() => { stopPlayback(); setLayers([]); }}
          disabled={!layers.length || busy}
          className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm inline-flex items-center gap-2 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> CLEAR ALL
        </button>
      </div>

      {/* Layers */}
      {layers.length > 0 && (
        <div className="mt-6 space-y-3">
          {layers.map((l, i) => (
            <div key={l.id} className="p-3 rounded-xl bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <input
                  value={l.name}
                  onChange={(e) => updateLayer(l.id, { name: e.target.value })}
                  className="bg-transparent flex-1 min-w-0 text-sm font-semibold outline-none border-b border-transparent focus:border-primary/40"
                />
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {fmt(l.trimEnd - l.trimStart)} / {fmt(l.duration)}
                </span>
                <button
                  onClick={() => updateLayer(l.id, { muted: !l.muted })}
                  className={`h-8 w-8 grid place-items-center rounded-lg border ${l.muted ? "bg-destructive/20 border-destructive/50" : "bg-background border-border"}`}
                  aria-label={l.muted ? "Unmute" : "Mute"}
                >
                  {l.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range" min={0} max={1.5} step={0.05} value={l.volume}
                  onChange={(e) => updateLayer(l.id, { volume: parseFloat(e.target.value) })}
                  className="w-24 accent-primary"
                  aria-label="Volume"
                />
                <button
                  onClick={() => removeLayer(l.id)}
                  className="h-8 w-8 grid place-items-center rounded-lg bg-background border border-border hover:border-destructive hover:text-destructive"
                  aria-label="Delete layer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <LayerWaveform
                buffer={l.buffer}
                trimStart={l.trimStart}
                trimEnd={l.trimEnd}
                fadeIn={l.fadeIn}
                fadeOut={l.fadeOut}
                onChange={(patch) => updateLayer(l.id, patch)}
              />

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <label className="flex items-center gap-2">
                  <span className="w-14 text-muted-foreground tracking-widest">FADE IN</span>
                  <input
                    type="range" min={0} max={Math.max(0.1, (l.trimEnd - l.trimStart) / 2)} step={0.05}
                    value={l.fadeIn}
                    onChange={(e) => updateLayer(l.id, { fadeIn: parseFloat(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 tabular-nums text-right">{l.fadeIn.toFixed(2)}s</span>
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-14 text-muted-foreground tracking-widest">FADE OUT</span>
                  <input
                    type="range" min={0} max={Math.max(0.1, (l.trimEnd - l.trimStart) / 2)} step={0.05}
                    value={l.fadeOut}
                    onChange={(e) => updateLayer(l.id, { fadeOut: parseFloat(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 tabular-nums text-right">{l.fadeOut.toFixed(2)}s</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      <div className="mt-6 grid gap-3 md:grid-cols-2 p-3 rounded-xl bg-secondary/40 border border-border">
        <div className="flex items-center gap-2 text-xs">
          <span className="tracking-widest text-muted-foreground">FORMAT</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {(["mp3", "wav"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 font-bold uppercase ${format === f ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {format === "mp3" && (
          <label className="flex items-center gap-2 text-xs">
            <span className="tracking-widest text-muted-foreground">BITRATE</span>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(parseInt(e.target.value) as Mp3Bitrate)}
              className="bg-background border border-border rounded px-2 py-1.5"
            >
              <option value={96}>96 kbps · Draft</option>
              <option value={128}>128 kbps · Radio</option>
              <option value={192}>192 kbps · High</option>
              <option value={320}>320 kbps · Max</option>
            </select>
          </label>
        )}
      </div>

      {/* Publish */}
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track title — e.g. Bama Anthem"
          maxLength={80}
          className="px-4 py-3 rounded-xl bg-secondary border border-border text-sm outline-none focus:border-primary"
        />
        <button
          onClick={publish}
          disabled={publishing || busy || !layers.length}
          className="px-5 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {mixing ? "MIXING…" : publishing ? "PUBLISHING…" : `PUBLISH ${format.toUpperCase()}`}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Trim &amp; fades are baked in, layers &amp; beat mix down to a single {format.toUpperCase()} file, then posted to the public feed.
      </p>
    </section>
  );
};

export default MultiTrackRecorder;
