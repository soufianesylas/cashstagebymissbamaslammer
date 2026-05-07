import { useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

interface UseRecorderResult {
  state: RecorderState;
  elapsed: number;
  levels: number[]; // 32 bars, 0..1
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  start: (opts?: { beatUrl?: string | null; beatVolume?: number; micVolume?: number }) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

const BAR_COUNT = 32;

export const useAudioRecorder = (): UseRecorderResult => {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const beatAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const tickLevels = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    const next: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += data[i * step + j];
      next.push(Math.min(1, sum / step / 180));
    }
    setLevels(next);
    rafRef.current = requestAnimationFrame(tickLevels);
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    rafRef.current = null;
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (beatAudioRef.current) {
      beatAudioRef.current.pause();
      beatAudioRef.current.src = "";
      beatAudioRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const start: UseRecorderResult["start"] = async (opts) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const micSource = ctx.createMediaStreamSource(stream);
      const micGain = ctx.createGain();
      micGain.gain.value = opts?.micVolume ?? 1;
      micSource.connect(micGain);

      const dest = ctx.createMediaStreamDestination();
      micGain.connect(dest);

      // Analyser hears the mix
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      micGain.connect(analyser);

      // Optional beat layer
      if (opts?.beatUrl) {
        const beatEl = new Audio();
        beatEl.crossOrigin = "anonymous";
        beatEl.src = opts.beatUrl;
        beatEl.loop = true;
        beatEl.preload = "auto";
        beatAudioRef.current = beatEl;

        const beatSource = ctx.createMediaElementSource(beatEl);
        const beatGain = ctx.createGain();
        beatGain.gain.value = opts?.beatVolume ?? 0.7;
        beatSource.connect(beatGain);
        beatGain.connect(dest);
        beatGain.connect(ctx.destination); // user hears the beat
        beatGain.connect(analyser);

        await beatEl.play().catch(() => {});
      }

      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start(250);
      recorderRef.current = recorder;

      rafRef.current = requestAnimationFrame(tickLevels);

      startTimeRef.current = Date.now();
      accumulatedRef.current = 0;
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000);
      }, 100);

      setState("recording");
    } catch (e: any) {
      setError(e?.message ?? "Microphone access denied.");
    }
  };

  const pause = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.pause();
      beatAudioRef.current?.pause();
      accumulatedRef.current += (Date.now() - startTimeRef.current) / 1000;
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setState("paused");
    }
  };

  const resume = () => {
    if (recorderRef.current?.state === "paused") {
      recorderRef.current.resume();
      beatAudioRef.current?.play().catch(() => {});
      startTimeRef.current = Date.now();
      tickRef.current = window.setInterval(() => {
        setElapsed(accumulatedRef.current + (Date.now() - startTimeRef.current) / 1000);
      }, 100);
      rafRef.current = requestAnimationFrame(tickLevels);
      setState("recording");
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    cleanup();
    setLevels(Array(BAR_COUNT).fill(0));
    setState("stopped");
  };

  const reset = () => {
    cleanup();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    setLevels(Array(BAR_COUNT).fill(0));
    setState("idle");
    setError(null);
    accumulatedRef.current = 0;
  };

  return { state, elapsed, levels, audioBlob, audioUrl, error, start, pause, resume, stop, reset };
};
