# Recording Studio with Auto-Tune

A `/studio` page where artists record vocals and ad-libs over a beat, mix it down, and optionally render a polished version through AI auto-tune. Saves the final mix as a regular `tracks` row so it flows into the rest of the app (drops, contests, judging).

## User flow

1. Open Studio → pick a beat (own upload, approved community beat, or upload one now).
2. Pick **Key** (C, C#, D … B) and **Scale** (Major / Minor / Chromatic). This drives both the live monitor and the final render.
3. Hit Record → beat plays, mic captures vocal take. Live waveform + a real-time pitch indicator shows the nearest note in the chosen scale (green = in-key, red = off).
4. Stack takes: **Lead Vocal**, **Ad-libs 1**, **Ad-libs 2**, **Harmony** (4 vocal lanes + beat lane = multitrack). Each lane has volume, mute, solo, delete-take.
5. Real-time monitor auto-tune toggle: snaps headphone monitor pitch toward the scale while recording (browser-side, low-latency, "rough" quality — labelled as such).
6. Preview the mix in the browser (all lanes summed against the beat).
7. **Render** button → uploads stems to backend, edge function sends vocal stems to the AI auto-tune provider with the key/scale, mixes the returned tuned stems back with the beat, writes the final WAV/MP3 to the `tracks` bucket, and inserts a `tracks` row.
8. Studio history page lists past sessions so you can re-open, re-render, or delete.

## Auto-tune providers

- **Real-time (browser):** AudioWorklet using `pitchy` for pitch detection + a phase-vocoder pitch-shift node, snapping detected pitch to the nearest note in the selected key/scale. Free, runs on-device, "monitor quality."
- **Final render (server):** Replicate via the gateway-enabled connector, using a pitch-correction model (e.g. a hosted RVC/auto-tune model). Requires the user to link the **Replicate** connector — I'll trigger that flow before building the render edge function. No raw secret needed; the gateway handles auth.

## Scope guardrails

- One studio session = one beat + up to 4 vocal lanes. No effects rack, no MIDI, no VST.
- Final render is one job per session; re-render replaces the previous output.
- Free tier: 1 render/day. Premium/VIP: unlimited (matches existing tier model).
- Mobile: record works on iOS Safari 16+ / Android Chrome; AudioWorklet auto-tune monitor disabled on iOS (CPU) — render still works.
- Anonymous-voting rule untouched: studio is creator-only; nothing here exposes votes.

## Data model

New tables (all auth-only, RLS by `user_id`):

- `studio_sessions` — `user_id`, `beat_id` (nullable), `beat_storage_path`, `title`, `key` (text), `scale` (text: major|minor|chromatic), `bpm` (nullable), `status` (draft|rendering|ready|failed), `rendered_track_id` (fk → tracks, nullable).
- `studio_takes` — `session_id`, `lane` (lead|adlib1|adlib2|harmony), `storage_path`, `duration_ms`, `volume` (0-1), `muted` (bool), `created_at`. One row per recorded take; user can have multiple takes per lane and pick the active one.

New storage bucket: `studio` (private). Paths: `studio/{user_id}/{session_id}/{lane}-{take_id}.webm`.

## Files to add

```text
src/pages/Studio.tsx                      # session picker + recorder shell
src/pages/StudioSession.tsx               # the actual multitrack DAW UI
src/components/studio/BeatPicker.tsx
src/components/studio/KeyScaleSelector.tsx
src/components/studio/LaneRecorder.tsx    # one vocal lane (record/playback/volume/mute/solo)
src/components/studio/MixdownPreview.tsx
src/components/studio/PitchMeter.tsx      # live in-key indicator
src/components/studio/RenderDialog.tsx    # confirm + progress for AI render
src/hooks/useStudioEngine.tsx             # Web Audio graph: beat + lanes + monitor autotune
src/hooks/useMicRecorder.tsx
src/lib/audio/scales.ts                   # key+scale → allowed semitones
src/lib/audio/pitchCorrect.ts             # AudioWorklet glue (pitchy + phase vocoder)
public/worklets/autotune-processor.js     # the AudioWorklet itself
supabase/functions/studio-render/index.ts # mix stems, call Replicate, write tracks row
```

Route added to `src/App.tsx`: `/studio` and `/studio/:sessionId`. Nav entry added to the existing nav so users can find it.

## Order of operations

1. Ask you to link the **Replicate** connector (required for the final render step). I'll stop and wait.
2. DB migration for `studio_sessions`, `studio_takes`, the `studio` storage bucket, and their RLS.
3. Studio UI + recording engine + real-time auto-tune monitor (works end-to-end without the render step).
4. `studio-render` edge function + Render button wired up.
5. Smoke test in preview and confirm a rendered take lands in the user's tracks.

## Open questions before I build

- OK to require linking the **Replicate** connector for the final AI render? (Real-time monitor works without it.)
- Should rendered studio tracks auto-publish as a Drop, or stay in the user's library until they choose to drop them?
