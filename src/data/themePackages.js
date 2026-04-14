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
// Registry
// ---------------------------------------------------------------------------
export const THEME_PACKAGES = [BORN_SLIPPY, DARK_AND_LONG];

export function getPackageById(id) {
  return THEME_PACKAGES.find(p => p.id === id) || BORN_SLIPPY;
}
