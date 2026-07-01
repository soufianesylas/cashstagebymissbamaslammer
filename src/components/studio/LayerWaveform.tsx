import { useEffect, useRef } from "react";

interface Props {
  buffer: AudioBuffer;
  trimStart: number; // seconds
  trimEnd: number;   // seconds (absolute)
  fadeIn: number;    // seconds
  fadeOut: number;   // seconds
  onChange: (patch: { trimStart?: number; trimEnd?: number }) => void;
  height?: number;
}

/** Waveform view with draggable trim markers + fade shading. */
const LayerWaveform = ({ buffer, trimStart, trimEnd, fadeIn, fadeOut, onChange, height = 64 }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<null | "start" | "end">(null);
  const duration = buffer.duration;

  // Draw waveform once per buffer/size.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, height);

    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    const mid = height / 2;

    ctx.fillStyle = "hsl(0 0% 100% / 0.35)";
    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      const start = x * step;
      const end = Math.min(data.length, start + step);
      for (let i = start; i < end; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = (1 - max) * mid;
      const y2 = (1 - min) * mid;
      ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
    }
  }, [buffer, height]);

  const pctOf = (t: number) => `${(Math.max(0, Math.min(duration, t)) / duration) * 100}%`;

  const onPointerDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = which;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    if (draggingRef.current === "start") {
      onChange({ trimStart: Math.min(t, trimEnd - 0.05) });
    } else {
      onChange({ trimEnd: Math.max(t, trimStart + 0.05) });
    }
  };
  const onPointerUp = () => { draggingRef.current = null; };

  const fadeInEnd = Math.min(trimStart + fadeIn, trimEnd);
  const fadeOutStart = Math.max(trimEnd - fadeOut, trimStart);

  return (
    <div
      ref={wrapRef}
      className="relative w-full rounded-lg bg-background/60 border border-border overflow-hidden select-none"
      style={{ height }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Trimmed regions (outside kept window) */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-background/70 pointer-events-none"
        style={{ width: pctOf(trimStart) }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 bg-background/70 pointer-events-none"
        style={{ width: `calc(100% - ${pctOf(trimEnd)})` }}
      />

      {/* Fade shading */}
      {fadeIn > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-primary/15 pointer-events-none"
          style={{ left: pctOf(trimStart), width: `calc(${pctOf(fadeInEnd)} - ${pctOf(trimStart)})` }}
        />
      )}
      {fadeOut > 0 && (
        <div
          className="absolute top-0 bottom-0 bg-primary/15 pointer-events-none"
          style={{ left: pctOf(fadeOutStart), width: `calc(${pctOf(trimEnd)} - ${pctOf(fadeOutStart)})` }}
        />
      )}

      {/* Handles */}
      <button
        aria-label="Trim start"
        onPointerDown={onPointerDown("start")}
        className="absolute top-0 bottom-0 w-2 -ml-1 bg-primary cursor-ew-resize touch-none"
        style={{ left: pctOf(trimStart) }}
      />
      <button
        aria-label="Trim end"
        onPointerDown={onPointerDown("end")}
        className="absolute top-0 bottom-0 w-2 -ml-1 bg-primary cursor-ew-resize touch-none"
        style={{ left: pctOf(trimEnd) }}
      />
    </div>
  );
};

export default LayerWaveform;
