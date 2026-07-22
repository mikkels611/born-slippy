// End-to-end smoke test for src/midi_exporter.js.
// Builds a synthetic 2-slot song and writes it to /tmp so we can feed
// it to `cat play-midi` for a hardware round-trip.
//
// Run:
//   node test/test_exporter.mjs

import { writeFileSync } from "node:fs";
import { exportSongToMidi } from "../src/midi_exporter.js";

// Inline copy of the DRIVE pattern from src/App.jsx — just so this
// test stays standalone. (The exporter takes fixedPatterns as input
// so we don't need to import App.jsx.)
const FIXED_PATTERNS = [
  {
    name: "DRIVE",
    bass: [82.41,82.41,98.0,98.0,110.0,110.0,98.0,82.41,82.41,82.41,123.47,110.0,98.0,82.41,82.41,73.42],
    accent: [1,0.4,0.8,0.3,0.9,0.4,0.7,0.6,1,0.3,0.8,0.5,0.7,0.9,0.4,0.6],
    kick: [1,0,0,0.15,1,0,0,0,1,0,0,0.15,1,0,0.2,0],
    ohat: [0,0,0.5,0,0,0,0.7,0,0,0,0.5,0,0,0,0.7,0.3],
    chat: [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
    clap: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  },
];

// Two slots — both pointing at DRIVE but with very different mixer
// snapshots so the slot transition produces an audible filter + delay
// move.
const slots = new Array(24).fill(null);
slots[0] = {
  fixedIndex: 0,
  channels: { filterCut: 300, delayMix: 0.05, drive: 0.1, bassVol: 0.4, kickVol: 0.9, hatVol: 0.6, clapVol: 0.7 },
};
slots[1] = {
  fixedIndex: 0,
  channels: { filterCut: 2500, delayMix: 0.75, drive: 0.8, bassVol: 0.95, kickVol: 0.5, hatVol: 0.85, clapVol: 0.3, clapMute: true },
};

const bytes = exportSongToMidi({
  slots,
  fixedPatterns: FIXED_PATTERNS,
  seqBars: 1,
  fadeMode: true,
  fadeSteps: 16,
  bpm: 133,
});

// ---- structural assertions for the born_slippy_a4_rytm export shape ----

function assert(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
}

// Split MTrk chunks.
const tracks = [];
for (let i = 14; i < bytes.length; ) {
  const len = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7];
  tracks.push(bytes.slice(i + 8, i + 8 + len));
  i += 8 + len;
}
assert(tracks.length === 6, `expected 6 tracks, got ${tracks.length}`);

function trackNameOf(body) {
  // track_name meta 0xFF 0x03 at the first event
  const idx = body.findIndex((b, j) => b === 0xff && body[j + 1] === 0x03);
  const len = body[idx + 2];
  return String.fromCharCode(...body.slice(idx + 3, idx + 3 + len));
}
const names = tracks.slice(1).map(trackNameOf);
assert(JSON.stringify(names) === JSON.stringify(["bass", "kick", "hihat", "openhat", "clap"]),
  `track names: ${names}`);

function scan(body) {
  const found = { notes: new Set(), noteChannels: new Set(), ccs: new Set(), ccChannels: new Set() };
  for (let j = 0; j < body.length - 2; j++) {
    const s = body[j];
    if ((s & 0xf0) === 0x90 && body[j + 2] > 0) { found.notes.add(body[j + 1]); found.noteChannels.add((s & 0x0f) + 1); }
    if ((s & 0xf0) === 0xb0) { found.ccs.add(body[j + 1]); found.ccChannels.add((s & 0x0f) + 1); }
  }
  return found;
}
const [bass, kick, hihat, openhat, clap] = tracks.slice(1).map(scan);

// Drum lanes: trig notes on the auto channel; CC 94/95 on the voice channel.
assert(kick.notes.has(0) && kick.noteChannels.has(14), "kick = trig 0 on ch14");
assert(hihat.notes.has(8) && openhat.notes.has(9), "hat trig notes 8/9");
assert(clap.notes.has(3), "clap = trig 3");
assert(kick.ccChannels.has(1) && hihat.ccChannels.has(9) && openhat.ccChannels.has(10) && clap.ccChannels.has(4),
  "drum CC channels = voice tracks 1/9/10/4");
// Bass: real pitches (E2=40 for 82.41 Hz), CC 95 level only — no Digitone bus.
assert(bass.notes.has(40) && bass.noteChannels.has(4), "bass pitches on ch4");
for (const t of [bass, kick, hihat, openhat, clap]) {
  assert(t.ccs.has(95) && t.ccs.has(94), "CC 94+95 present");
  for (const dead of [7, 9, 13, 23]) assert(!t.ccs.has(dead), `stale Digitone CC ${dead} present`);
}

const out = "/tmp/born-slippy-test.mid";
writeFileSync(out, bytes);
console.log(`OK — 6 tracks (${names.join(", ")}); wrote ${out} (${bytes.byteLength} bytes)`);
