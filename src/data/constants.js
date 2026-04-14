export const DEFAULT_BPM = 133;
export const STEPS = 16;

export function getStepTime(bpm) {
  return 60 / bpm / 4;
}

export const WHOLE_TONE_DOWN = 1 / Math.pow(2, 2 / 12);
export const MINOR_THIRD_UP = Math.pow(2, 3 / 12);

export const PATTERN_COLORS = ["#e05020", "#20a0e0", "#20c060", "#9040c0"];

export const RND_COLORS = [
  "#8020e0", "#e02080", "#e0a020",
  "#e04040", "#6060e0", "#e06020", "#20e0b0", "#b020e0",
  "#e02020", "#e0e020", "#60e020", "#e020c0",
  "#20e0e0", "#a0e020", "#e08060", "#8060e0", "#e06080",
];
