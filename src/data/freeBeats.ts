// Royalty-free instrumentals for the Cash Stage Studio.
// Hosted on SoundHelix (free for any use, including commercial).
// https://www.soundhelix.com/audio-examples

export interface FreeBeat {
  id: string;
  title: string;
  bpm: number;
  vibe: string;
  url: string;
}

const sh = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

export const FREE_BEATS: FreeBeat[] = [
  { id: "trap-stage", title: "Stage Lights", bpm: 140, vibe: "Trap", url: sh(1) },
  { id: "drill-bama", title: "Bama Drill", bpm: 142, vibe: "Drill", url: sh(2) },
  { id: "boom-bap", title: "Boom Bap Roll", bpm: 92, vibe: "Boom Bap", url: sh(3) },
  { id: "lofi-mic", title: "Lo-Fi Mic Check", bpm: 80, vibe: "Lo-Fi", url: sh(4) },
  { id: "club-bounce", title: "Club Bounce", bpm: 128, vibe: "Club", url: sh(5) },
  { id: "808-cash", title: "808 Cash Out", bpm: 150, vibe: "Trap", url: sh(6) },
  { id: "soul-sample", title: "Soul Sample", bpm: 88, vibe: "Soul", url: sh(7) },
  { id: "west-coast", title: "West Coast Cruise", bpm: 96, vibe: "G-Funk", url: sh(8) },
  { id: "rage-mode", title: "Rage Mode", bpm: 160, vibe: "Rage", url: sh(9) },
  { id: "midnight", title: "Midnight Stage", bpm: 110, vibe: "Ambient", url: sh(10) },
  { id: "freestyle", title: "Freestyle Cypher", bpm: 90, vibe: "Boom Bap", url: sh(11) },
  { id: "battle-mode", title: "Battle Mode", bpm: 145, vibe: "Trap", url: sh(12) },
];
