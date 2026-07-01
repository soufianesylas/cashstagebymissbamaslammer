// MP3 encoder wrapper around @breezystack/lamejs.
// Bitrate is in kbps; typical: 96 (draft), 128 (radio), 192 (high), 320 (max).
import lamejs from "@breezystack/lamejs";

export type Mp3Bitrate = 96 | 128 | 192 | 320;

export function encodeMp3(buffer: AudioBuffer, bitrate: Mp3Bitrate = 192): Blob {
  const numCh = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const encoder = new lamejs.Mp3Encoder(numCh, sampleRate, bitrate);

  const floatTo16 = (f: Float32Array) => {
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const s = Math.max(-1, Math.min(1, f[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const left = floatTo16(buffer.getChannelData(0));
  const right = numCh > 1 ? floatTo16(buffer.getChannelData(1)) : null;

  const CHUNK = 1152;
  const chunks: Int8Array[] = [];
  for (let i = 0; i < left.length; i += CHUNK) {
    const lChunk = left.subarray(i, i + CHUNK);
    const rChunk = right ? right.subarray(i, i + CHUNK) : null;
    const mp3buf = rChunk
      ? encoder.encodeBuffer(lChunk, rChunk)
      : encoder.encodeBuffer(lChunk);
    if (mp3buf.length > 0) chunks.push(mp3buf);
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);

  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
