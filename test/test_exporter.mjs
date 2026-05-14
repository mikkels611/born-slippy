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
  channels: { filterCut: 300, delayMix: 0.05 },
};
slots[1] = {
  fixedIndex: 0,
  channels: { filterCut: 2500, delayMix: 0.75 },
};

const bytes = exportSongToMidi({
  slots,
  fixedPatterns: FIXED_PATTERNS,
  seqBars: 1,
  fadeMode: true,
  fadeSteps: 16,
  bpm: 133,
});

const out = "/tmp/born-slippy-test.mid";
writeFileSync(out, bytes);
console.log(`wrote ${out} (${bytes.byteLength} bytes)`);
