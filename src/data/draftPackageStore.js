/**
 * Draft Package Store
 * Single draft at a time, persisted to localStorage.
 * Used in admin mode (?admin=true) for tuning theme packages.
 */

const STORAGE_KEY = 'born-slippy-draft';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Create a draft from an existing theme package */
export function createDraft(basePackage) {
  const draft = deepClone(basePackage);
  draft._isDraft = true;
  draft._baseId = basePackage.id;
  draft._createdAt = new Date().toISOString();
  // Convert flat patterns to sets if not already
  if (!draft.sets) {
    draft.sets = [{
      name: "Set A",
      patterns: draft.patterns,
      patternColors: draft.patternColors,
    }];
  }
  draft._activeSet = 0;
  saveDraft(draft);
  return draft;
}

/** Save current draft to localStorage */
export function saveDraft(draft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Load draft from localStorage (returns null if none) */
export function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Clear the current draft */
export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get the active set's patterns and colors from a draft */
export function getActiveSet(draft) {
  const idx = draft._activeSet || 0;
  const set = draft.sets[idx];
  return set || draft.sets[0];
}

/** Get patterns array for the active set (for sequencer consumption) */
export function getDraftPatterns(draft) {
  return getActiveSet(draft).patterns;
}

/** Get pattern colors for the active set */
export function getDraftColors(draft) {
  return getActiveSet(draft).patternColors;
}

/** Capture a pattern into a draft set slot */
export function captureToDraft(draft, setIndex, patternIndex, patternData, channelSnapshot) {
  const set = draft.sets[setIndex];
  if (!set) return draft;
  const captured = deepClone(patternData);
  // Attach channel snapshot as preset
  captured.channels = {
    bassVol: channelSnapshot.bassVol,
    kickVol: channelSnapshot.kickVol,
    hatVol: channelSnapshot.hatVol,
    clapVol: channelSnapshot.clapVol,
    filterCut: channelSnapshot.filterCut,
    delayMix: channelSnapshot.delayMix,
    drive: channelSnapshot.drive,
  };
  set.patterns[patternIndex] = captured;
  saveDraft(draft);
  return deepClone(draft);
}

/** Update a pattern's name and description */
export function updatePatternMeta(draft, setIndex, patternIndex, name, description) {
  const set = draft.sets[setIndex];
  if (!set || !set.patterns[patternIndex]) return draft;
  set.patterns[patternIndex].name = name;
  if (description !== undefined) set.patterns[patternIndex].description = description;
  saveDraft(draft);
  return deepClone(draft);
}

/** Update draft-level metadata */
export function updateDraftMeta(draft, fields) {
  if (fields.name !== undefined) draft.name = fields.name;
  if (fields.artist !== undefined) draft.artist = fields.artist;
  if (fields.description !== undefined) draft.description = fields.description;
  if (fields.key !== undefined) draft.key = fields.key;
  if (fields.bpm !== undefined) draft.bpm = fields.bpm;
  if (fields.id !== undefined) draft.id = fields.id;
  saveDraft(draft);
  return deepClone(draft);
}

/** Update pattern color for a slot in active set */
export function updatePatternColor(draft, setIndex, patternIndex, color) {
  const set = draft.sets[setIndex];
  if (!set) return draft;
  set.patternColors[patternIndex] = color;
  saveDraft(draft);
  return deepClone(draft);
}

/** Add a new empty set to the draft */
export function addSet(draft, name) {
  draft.sets.push({
    name: name || `Set ${String.fromCharCode(65 + draft.sets.length)}`,
    patterns: [
      { name: "P1", description: "", bass: Array(16).fill(0), accent: Array(16).fill(0), kick: Array(16).fill(0), ohat: Array(16).fill(0), chat: Array(16).fill(0), clap: Array(16).fill(0) },
      { name: "P2", description: "", bass: Array(16).fill(0), accent: Array(16).fill(0), kick: Array(16).fill(0), ohat: Array(16).fill(0), chat: Array(16).fill(0), clap: Array(16).fill(0) },
      { name: "P3", description: "", bass: Array(16).fill(0), accent: Array(16).fill(0), kick: Array(16).fill(0), ohat: Array(16).fill(0), chat: Array(16).fill(0), clap: Array(16).fill(0) },
      { name: "P4", description: "", bass: Array(16).fill(0), accent: Array(16).fill(0), kick: Array(16).fill(0), ohat: Array(16).fill(0), chat: Array(16).fill(0), clap: Array(16).fill(0) },
    ],
    patternColors: ["#e05020", "#20a0e0", "#20c060", "#9040c0"],
  });
  saveDraft(draft);
  return deepClone(draft);
}

/** Delete a set from the draft (minimum 1 set must remain) */
export function deleteSet(draft, setIndex) {
  if (draft.sets.length <= 1) return draft;
  draft.sets.splice(setIndex, 1);
  if (draft._activeSet >= draft.sets.length) draft._activeSet = draft.sets.length - 1;
  saveDraft(draft);
  return deepClone(draft);
}

/** Switch active set index */
export function switchSet(draft, setIndex) {
  draft._activeSet = Math.max(0, Math.min(setIndex, draft.sets.length - 1));
  saveDraft(draft);
  return deepClone(draft);
}

/** Export draft as a clean theme package JSON (strips internal fields) */
export function exportDraftAsJson(draft) {
  const clean = deepClone(draft);
  delete clean._isDraft;
  delete clean._baseId;
  delete clean._createdAt;
  delete clean._activeSet;
  // If single set, flatten back to patterns/patternColors for backward compat
  if (clean.sets.length === 1) {
    clean.patterns = clean.sets[0].patterns;
    clean.patternColors = clean.sets[0].patternColors;
    delete clean.sets;
  }
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `theme-${clean.id || "draft"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import a JSON file as a draft */
export function importDraftFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.id || !data.name) { reject(new Error("Invalid package: missing id or name")); return; }
        // Normalize to sets format
        if (!data.sets && data.patterns) {
          data.sets = [{
            name: "Set A",
            patterns: data.patterns,
            patternColors: data.patternColors || ["#e05020", "#20a0e0", "#20c060", "#9040c0"],
          }];
        }
        if (!data.sets || !data.sets.length) { reject(new Error("Invalid package: no patterns or sets")); return; }
        data._isDraft = true;
        data._baseId = data.id;
        data._createdAt = new Date().toISOString();
        data._activeSet = 0;
        saveDraft(data);
        resolve(data);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
