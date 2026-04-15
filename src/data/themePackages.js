/**
 * Theme Package Format v1
 *
 * A Theme Package defines the complete musical DNA for a Born Slippy session:
 * - id:             Unique string identifier (kebab-case)
 * - formatVersion:  Package schema version (currently 1)
 * - name:           Display name
 * - artist:         Original artist / inspiration
 * - description:    Short text blurb
 * - bpm:            Tempo in beats per minute
 * - key:            Musical key string (e.g. "Em", "Am")
 * - patterns:       Array of exactly 4 core patterns, each with:
 *                     { name, description, bass[16], accent[16], kick[16], ohat[16], chat[16], clap[16] }
 * - patternColors:  Array of 4 hex color strings for the pattern buttons
 * - scalePools:     Array of note-frequency arrays used by Random to generate
 *                   harmonically related variations
 * - synthParams:    (optional) Per-package bass synthesis overrides:
 *                     { osc1, osc2, osc3, osc2Detune, osc3Octave, osc3Level,
 *                       attack, decay, sustainLevel }
 *
 * Future fields (reserved):
 * - price:          Number (catalogue purchase price)
 * - creatorId:      UUID of the package creator
 * - coverImage:     URL to artwork
 * - tags:           Array of genre/mood tags
 * - kickTemplates, hatTemplates, clapTemplates:  Package-specific drum seeds
 */

export const PACKAGE_FORMAT_VERSION = 1;

// ---------------------------------------------------------------------------
// Born Slippy — Underworld  |  133 BPM  |  E minor
// ---------------------------------------------------------------------------
export const BORN_SLIPPY = {
  id: "born-slippy",
  formatVersion: PACKAGE_FORMAT_VERSION,
  name: "Born Slippy",
  artist: "Underworld",
  description: "The iconic acid-tinged techno of Born Slippy .NUXX",
  bpm: 133,
  key: "Em",

  patterns: [
    {
      name: "DRIVE",
      description: "Relentless E2 riff climbing through G/A/B — the iconic Born Slippy groove",
      bass:   [82.41,82.41,98,98,110,110,98,82.41,82.41,82.41,123.47,110,98,82.41,82.41,73.42],
      accent: [1,0.4,0.8,0.3,0.9,0.4,0.7,0.6,1,0.3,0.8,0.5,0.7,0.9,0.4,0.6],
      kick:   [1,0,0,0.15,1,0,0,0,1,0,0,0.15,1,0,0.2,0],
      ohat:   [0,0,0.5,0,0,0,0.7,0,0,0,0.5,0,0,0,0.7,0.3],
      chat:   [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    },
    {
      name: "BREAK",
      description: "Stripped-back stabs with silence between — tension builder for drops",
      bass:   [82.41,0,0,82.41,0,0,98,0,82.41,0,0,73.42,0,0,82.41,0],
      accent: [1,0,0,0.5,0,0,0.7,0,0.9,0,0,0.6,0,0,0.8,0],
      kick:   [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
      ohat:   [0,0,0,0,0,0,0.5,0,0,0,0,0,0,0,0.6,0],
      chat:   [0,0,0.2,0,0,0,0,0.15,0,0,0.2,0,0,0,0,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0.4],
    },
    {
      name: "PUSH",
      description: "Ascending phrases through the full E minor scale — energy and momentum",
      bass:   [82.41,0,98,82.41,110,0,123.47,98,82.41,0,98,110,123.47,98,82.41,0],
      accent: [1,0,0.7,0.4,0.9,0,0.8,0.5,1,0,0.7,0.6,0.8,0.5,0.9,0],
      kick:   [1,0,0,0.3,1,0,0,0,0,0,1,0,1,0,0.4,0],
      ohat:   [0,0,0.6,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.6],
      chat:   [0.3,0.2,0,0.2,0.3,0.15,0.25,0,0.3,0.2,0,0.2,0.3,0.15,0.25,0],
      clap:   [0,0,0,0,1,0,0,0,0,0,0.3,0,1,0,0,0.25],
    },
    {
      name: "DARK",
      description: "Hypnotic E2 drone with subtle D2 descent — minimal and brooding",
      bass:   [82.41,82.41,82.41,82.41,82.41,82.41,82.41,82.41,73.42,73.42,73.42,73.42,82.41,82.41,82.41,82.41],
      accent: [1,0.2,0.3,0.15,0.8,0.15,0.2,0.1,0.9,0.2,0.25,0.15,1,0.15,0.3,0.2],
      kick:   [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0.2],
      ohat:   [0,0,0,0,0,0,0.4,0,0,0,0,0,0,0,0.4,0],
      chat:   [0.15,0,0.1,0,0.15,0,0,0,0.15,0,0.1,0,0.15,0,0,0.1],
      clap:   [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    },
  ],

  patternColors: ["#e05020", "#20a0e0", "#20c060", "#9040c0"],

  scalePools: [
    [82.41, 98, 110, 123.47, 73.42],
    [82.41, 92.50, 98, 110, 123.47, 130.81, 146.83],
    [82.41, 98, 123.47, 164.81],
    [82.41, 123.47, 164.81, 110],
    [82.41, 87.31, 98, 116.54, 73.42],
  ],
};

// ---------------------------------------------------------------------------
// Dark & Long — Underworld  |  135 BPM  |  A minor
// ---------------------------------------------------------------------------
export const DARK_AND_LONG = {
  id: "dark-and-long",
  formatVersion: PACKAGE_FORMAT_VERSION,
  name: "Dark & Long",
  artist: "Underworld",
  description: "Deep hypnotic dub techno — layers of delay and relentless groove",
  bpm: 135,
  key: "Am",

  patterns: [
    {
      name: "PULSE",
      description: "Relentless A2 groove with E/G/C movement — steady closed hats, classic 4/4",
      bass:   [110,110,82.41,110,110,98,110,82.41,110,110,130.81,110,98,82.41,110,73.42],
      accent: [1,0.4,0.7,0.3,0.9,0.5,0.6,0.4,1,0.3,0.8,0.4,0.7,0.5,0.9,0.3],
      kick:   [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0.15],
      ohat:   [0,0,0.5,0,0,0,0.6,0,0,0,0.5,0,0,0,0.6,0],
      chat:   [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
    },
    {
      name: "DUB",
      description: "Sparse notes with rests — designed for delay effects to fill the space",
      bass:   [110,0,0,82.41,0,0,98,0,110,0,0,0,82.41,0,0,0],
      accent: [1,0,0,0.6,0,0,0.7,0,0.9,0,0,0,0.5,0,0,0],
      kick:   [1,0,0,0,1,0,0,0.15,1,0,0,0,0,0,0,0],
      ohat:   [0,0,0,0,0,0,0.5,0,0,0,0,0,0,0,0.6,0],
      chat:   [0,0,0.15,0,0,0,0,0.1,0,0,0.15,0,0,0,0,0.1],
      clap:   [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    },
    {
      name: "RISE",
      description: "Ascending phrases reaching C3 — busier kicks with ghost notes, building energy",
      bass:   [110,110,130.81,110,82.41,98,110,130.81,110,98,110,130.81,82.41,98,110,110],
      accent: [1,0.5,0.8,0.4,0.7,0.6,0.9,0.7,1,0.4,0.8,0.7,0.6,0.5,1,0.3],
      kick:   [1,0,0,0.2,1,0,0.3,0,1,0,0,0.2,1,0,0.3,0],
      ohat:   [0,0,0.6,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.5],
      chat:   [0.3,0.2,0,0.2,0.3,0.15,0.2,0,0.3,0.2,0,0.2,0.3,0.15,0.25,0],
      clap:   [0,0,0,0,1,0,0,0.2,0,0,0,0,1,0,0,0.3],
    },
    {
      name: "DEEP",
      description: "Hypnotic A2 drone with subtle G2/E2 descent — minimal drums, maximum atmosphere",
      bass:   [110,110,110,110,110,110,110,110,98,98,82.41,82.41,110,110,110,110],
      accent: [1,0.2,0.3,0.15,0.8,0.2,0.25,0.15,0.9,0.2,0.3,0.15,1,0.2,0.25,0.15],
      kick:   [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      ohat:   [0,0,0,0,0,0,0.4,0,0,0,0,0,0,0,0.4,0],
      chat:   [0.15,0,0.1,0,0.15,0,0,0,0.15,0,0.1,0,0.15,0,0,0.1],
      clap:   [0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],
    },
  ],

  patternColors: ["#4040c0", "#20a0a0", "#c09020", "#8020a0"],

  scalePools: [
    [110, 98, 82.41, 130.81, 73.42],
    [110, 65.41, 73.42, 82.41, 87.31, 98, 130.81],
    [110, 130.81, 82.41, 98],
    [110, 82.41, 130.81, 73.42],
    [110, 87.31, 98, 65.41, 73.42],
  ],
};

// ---------------------------------------------------------------------------
// Dark & Long Sub — Underworld  |  135 BPM  |  A minor (one octave lower)
// ---------------------------------------------------------------------------
export const DARK_AND_LONG_SUB = {
  id: "dark-and-long-sub",
  formatVersion: PACKAGE_FORMAT_VERSION,
  name: "Dark & Long Sub",
  artist: "Underworld",
  description: "Minimoog sub-bass — fat detuned oscillators, long decay, deep groove",
  bpm: 135,
  key: "Am",

  // Minimoog-style synthesis: 3 detuned saws, slower attack, long fat decay
  synthParams: {
    osc1: "sawtooth",
    osc2: "sawtooth",
    osc3: "sawtooth",       // third oscillator one octave below
    osc2Detune: 12,         // cents — wider than default for chorus
    osc3Octave: -1,         // sub oscillator
    osc3Level: 0.5,         // sub level relative to main
    attack: 0.015,          // slightly slower attack — Moog warmth
    decay: 0.25,            // long sustain tail
    sustainLevel: 0.28,     // fat sustained tone
  },

  patterns: [
    {
      name: "THROB",
      description: "Syncopated A1 sub pulse with octave jumps — classic Moog groove",
      bass:   [55,0,55,0,55,49,0,55,0,55,41.20,0,55,0,49,55],
      accent: [1,0,0.7,0,0.9,0.6,0,0.5,0,0.8,0.7,0,1,0,0.6,0.4],
      kick:   [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      ohat:   [0,0,0.5,0,0,0,0.6,0,0,0,0.5,0,0,0,0.6,0],
      chat:   [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      channels: { bassVol:0.85, kickVol:0.75, hatVol:0.3, clapVol:0.45, filterCut:450, delayMix:0.2, drive:0.15 },
    },
    {
      name: "WALK",
      description: "Walking sub-bass through A-E-G with sparse feel — captured admin jam",
      bass:   [55,41.20,49,55,49,49,0,49,55,49,55,65.41,0,0,36.71,0],
      accent: [1,0.51,0.79,0.52,0.33,0.40,0,0.43,1,0.72,0.74,0.77,0,0,0.31,0],
      kick:   [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
      ohat:   [0,0,0.5,0,0,0,0.6,0,0,0,0.5,0,0,0,0.6,0],
      chat:   [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      channels: { bassVol:0.56, kickVol:0.75, hatVol:1, clapVol:0.45, filterCut:1066, delayMix:0.42, drive:0.32 },
    },
    {
      name: "CLIMB",
      description: "Sub-bass ascending from A1 through D2 to E2 — builds with ghost kicks",
      bass:   [55,55,0,55,65.41,0,55,73.42,55,0,65.41,73.42,82.41,0,55,0],
      accent: [1,0.5,0,0.4,0.8,0,0.6,0.9,1,0,0.7,0.8,0.9,0,0.5,0],
      kick:   [1,0,0,0.2,1,0,0.3,0,1,0,0,0.2,1,0,0.3,0],
      ohat:   [0,0,0.6,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.5],
      chat:   [0.3,0.2,0,0.2,0.3,0.15,0.2,0,0.3,0.2,0,0.2,0.3,0.15,0.25,0],
      clap:   [0,0,0,0,1,0,0,0.2,0,0,0,0,1,0,0,0.3],
      channels: { bassVol:0.8, kickVol:0.7, hatVol:0.35, clapVol:0.5, filterCut:600, delayMix:0.3, drive:0.25 },
    },
    {
      name: "PULSE",
      description: "Driving A1 sub with D2 lifts — open hats and wide filter",
      bass:   [55,55,55,55,55,55,65.41,55,55,65.41,65.41,65.41,55,55,65.41,41.20],
      accent: [1,0.67,0.36,0.70,1,0.63,0.37,0.41,1,0.71,0.62,0.58,1,0.45,0.60,0.35],
      kick:   [1,0,0,0,0,0,0,0,1,0,0,0.28,0,0,0.47,0],
      ohat:   [0,0,0.5,0,0,0,0.6,0,0,0,0.5,0,0,0,0.6,0],
      chat:   [0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],
      clap:   [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
      channels: { bassVol:0.50, kickVol:0.8, hatVol:0.87, clapVol:1, filterCut:2578, delayMix:0.25, drive:0.3 },
    },
  ],

  patternColors: ["#2040a0", "#1880a0", "#a07020", "#6020a0"],

  scalePools: [
    [55, 49, 41.20, 65.41, 36.71],
    [55, 32.70, 36.71, 41.20, 43.65, 49, 65.41],
    [55, 65.41, 41.20, 49],
    [55, 41.20, 65.41, 36.71],
    [55, 43.65, 49, 32.70, 36.71],
  ],
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const THEME_PACKAGES = [DARK_AND_LONG_SUB, BORN_SLIPPY, DARK_AND_LONG];

export function getPackageById(id) {
  return THEME_PACKAGES.find(p => p.id === id) || DARK_AND_LONG_SUB;
}
