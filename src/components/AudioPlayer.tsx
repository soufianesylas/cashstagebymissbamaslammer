import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  src: string;
  title?: string;
  compact?: boolean;
}

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

/** Play/pause + scrub audio player used across drops, beats, and collab feeds. */
export default function AudioPlayer({ src, title, compact }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onLoad = () => setDur(a.duration || 0);
    const onTime = () => setCur(a.currentTime || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("loadedmetadata", onLoad);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoad);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (v: number) => {
    const a = ref.current;
    if (!a || !dur) return;
    a.currentTime = (v / 100) * dur;
    setCur(a.currentTime);
  };

  return (
    <div className={`flex items-center gap-3 ${compact ? "p-2" : "p-3"} rounded-xl bg-secondary/70 border border-border`}>
      <audio ref={ref} src={src} preload="metadata" />
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform shrink-0"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        {title && !compact && <p className="text-xs font-semibold truncate mb-1">{title}</p>}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={dur ? (cur / dur) * 100 : 0}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1 accent-primary h-1"
            aria-label="Seek"
          />
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {fmt(cur)} / {fmt(dur)}
          </span>
        </div>
      </div>
    </div>
  );
}
