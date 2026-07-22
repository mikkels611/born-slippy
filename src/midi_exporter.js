// Born Slippy → CAT plugin import contract.
//
// Hand-rolled Standard MIDI File (SMF type 1) writer targeting the
// `born_slippy_a4_rytm` binding (cat change 013): five role-named
// tracks — bass / kick / hihat / openhat / clap — so
// `cat play-midi <file>.mid --binding born_slippy_a4_rytm` plays with
// zero import code. Walks the filled slots in slot-machine order,
// laying each out as `seqBars` bars.
//
// Drum notes are Rytm AUTO-channel trig notes (note = track − 1 picks
// the voice; manual §8.6), NOT GM pitches — that is what the binding's
// `rytm.auto` roles dispatch. Bass notes are real pitches (Hz → MIDI).
//
// Automation: lane volume as TRACK LEVEL (CC 95) ramps on each voice's
// OWN channel (CCs dispatch on the file channel, unlike notes — see
// contract §2.5), plus a CC 94 unmute anchor. The old Digitone bass CC
// bus (filter 23 / delay 13 / drive 9) is gone: those A4 parameters
// are NRPN-only, so FLTR/DRV/Delay automation is not representable in
// this export path yet. When `fadeMode` is on, level values lerp
// across each slot boundary over `fadeSteps * STEP_TIME` so CAT reads
// the transition as a CC ramp.
//
// Spec: /Users/mikkel/Code/cat/spec/plugin-contract.md (§2) and
// spec/openspec/changes/013-born-slippy-gateway/.

const TPB = 480;                  // ticks per quarter beat
const STEPS_PER_BAR = 16;         // 16th-note grid
const TICKS_PER_STEP = TPB / 4;   // 120 ticks
const TICKS_PER_BAR = TPB * 4;    // 4 quarters per bar (BS is fixed 4/4)

// 0-based SMF channels, mirroring ~/Code/cat-library/devices/*.toml:
// notes ride the binding's channels informationally (CAT re-routes by
// role name); CCs dispatch on exactly these channels.
const CH = {
  bass: 3,        // A4 T4 — channel 4 (notes + CC 94/95)
  drumNotes: 13,  // Rytm AUTO — channel 14 (all drum trig notes)
  kickCtl: 0,     // Rytm T1/BD — channel 1  (CC 94/95)
  clapCtl: 3,     // Rytm T4/CP — channel 4  (CC 94/95)
  hihatCtl: 8,    // Rytm T9/CH — channel 9  (CC 94/95)
  openhatCtl: 9,  // Rytm T10/OH — channel 10 (CC 94/95)
};

// Rytm auto-channel trig notes (track − 1). Hardware-verified 2026-07-22.
const TRIG = { kick: 0, clap: 3, chat: 8, ohat: 9 };

// ----- Utilities ---------------------------------------------------------

function hzToMidi(freq) {
  // round(69 + 12 * log2(freq / 440))
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

function unitToCC(v01) {
  return Math.max(0, Math.min(127, Math.round(v01 * 127)));
}

function vlq(value) {
  // Variable-length quantity: 7-bit big-endian with MSB=1 on all bytes
  // except the last.
  if (value < 0) throw new Error("vlq: negative not allowed");
  const bytes = [value & 0x7f];
  value >>= 7;
  while (value > 0) {
    bytes.unshift((value & 0x7f) | 0x80);
    value >>= 7;
  }
  return bytes;
}

function strBytes(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
  return out;
}

// ----- Event builders ----------------------------------------------------
//
// Each builder returns an event = { ticks: absolute_ticks, bytes: [...] }.
// We collect all events for a track, sort by ticks, then emit deltas.

function trackName(ticks, name) {
  return { ticks, bytes: [0xff, 0x03, ...vlq(name.length), ...strBytes(name)] };
}

function setTempo(ticks, bpm) {
  const usPerQuarter = Math.round(60_000_000 / bpm);
  return {
    ticks,
    bytes: [
      0xff, 0x51, 0x03,
      (usPerQuarter >> 16) & 0xff,
      (usPerQuarter >> 8) & 0xff,
      usPerQuarter & 0xff,
    ],
  };
}

function timeSig(ticks, num, denPow2) {
  // num = beats per bar; denPow2 = log2(denominator). 4/4 → 4, 2.
  return { ticks, bytes: [0xff, 0x58, 0x04, num, denPow2, 24, 8] };
}

function endOfTrack(ticks) {
  return { ticks, bytes: [0xff, 0x2f, 0x00] };
}

function noteOn(ticks, ch, pitch, vel) {
  return { ticks, bytes: [0x90 | (ch & 0x0f), pitch & 0x7f, vel & 0x7f] };
}

function noteOff(ticks, ch, pitch) {
  return { ticks, bytes: [0x80 | (ch & 0x0f), pitch & 0x7f, 0] };
}

function cc(ticks, ch, controller, value) {
  return {
    ticks,
    bytes: [0xb0 | (ch & 0x0f), controller & 0x7f, Math.max(0, Math.min(127, value | 0))],
  };
}

// ----- CC ramp helper ----------------------------------------------------

function rampCC(events, ch, controller, startTicks, endTicks, fromValue, toValue, steps) {
  // Linear interpolation in `steps + 1` events from startTicks .. endTicks
  // inclusive. Caller is responsible for pushing a final "anchor" CC
  // event at the destination slot's start if needed (we end exactly on
  // endTicks so usually that's redundant).
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ticks = Math.round(startTicks + t * (endTicks - startTicks));
    const value = Math.round(fromValue + t * (toValue - fromValue));
    events.push(cc(ticks, ch, controller, value));
  }
}

// ----- Slot extraction helpers ------------------------------------------
//
// A "slot" in Born Slippy is either:
//   { fixedIndex: 0..3, channels: {snapshot} }                 // fixed pattern
// or
//   { fixedIndex: -1, name, color, bass, accent, kick,
//     ohat, chat, clap, channels: {snapshot} }                 // saved random
//
// To get the pattern arrays for a fixed slot, look them up in
// FIXED_PATTERNS. The exporter caller passes both in.

function slotPattern(slot, fixedPatterns) {
  if (slot.fixedIndex >= 0) return fixedPatterns[slot.fixedIndex];
  return slot;  // saved random already has the arrays inline
}

// ----- Track builders ----------------------------------------------------

// Default per-role anchor: every export plants track_mute=0 at delta 0
// on the voice's own channel so playback is audible regardless of the
// device's mute state. Track level (CC 95) gets its first anchor from
// the first slot's volume value, also at delta 0.
function pushRoleInitCCs(events, channel) {
  events.push(cc(0, channel, 94, 0));     // track_mute = unmuted
}

function buildMetaTrack(bpm) {
  return [
    timeSig(0, 4, 2),
    setTempo(0, bpm),
    endOfTrack(0),
  ];
}

// Plant either a single anchor CC at slotStartTicks, or — when fadeMode
// is on and the value changed — a ramp from `prev` to `value` over the
// `fadeSteps` 16th-notes preceding slotStartTicks. Mirrors how the
// in-browser engine's `startFade()` lerps mixer/effect values across
// the slot boundary. Returns the new prev value.
function emitCCWithRamp(events, channel, controller, value, prev, slotStartTicks, fadeMode, fadeSteps) {
  if (prev === null || !fadeMode || prev === value) {
    events.push(cc(slotStartTicks, channel, controller, value));
  } else {
    const rampTicks = Math.round(fadeSteps * TICKS_PER_STEP);
    const startRamp = Math.max(0, slotStartTicks - rampTicks);
    rampCC(events, channel, controller, startRamp, slotStartTicks, prev, value, fadeSteps);
  }
  return value;
}

function buildDrumNoteTrack(name, noteChannel, ctlChannel, slots, fixedPatterns, seqBars, trigNote, patField, muteField, volField, fadeMode, fadeSteps) {
  // One note per non-zero step at the lane's Rytm trig note, on the
  // AUTO channel. Velocity = stepValue * 127. Lane volume rides TRACK
  // LEVEL (CC 95) on the voice's OWN channel (`ctlChannel`), anchored
  // or ramped per slot from `volField`. `muteField` suppresses note
  // triggers for that slot.
  const events = [trackName(0, name)];
  pushRoleInitCCs(events, ctlChannel);
  let barOffset = 0;
  let prevVol = null;
  for (const slot of slots) {
    const pat = slotPattern(slot, fixedPatterns);
    const muteFlag = slot.channels?.[muteField];
    const volValue = unitToCC(slot.channels?.[volField] ?? 0.8);
    const slotStartTicks = barOffset * TICKS_PER_BAR;

    prevVol = emitCCWithRamp(events, ctlChannel, 95, volValue, prevVol, slotStartTicks, fadeMode, fadeSteps);

    for (let bar = 0; bar < seqBars; bar++) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        const v = pat[patField]?.[step] || 0;
        if (v <= 0 || muteFlag) continue;
        const onTicks = slotStartTicks + bar * TICKS_PER_BAR + step * TICKS_PER_STEP;
        const offTicks = onTicks + Math.round(TICKS_PER_STEP * 0.95);
        events.push(noteOn(onTicks, noteChannel, trigNote, unitToCC(v)));
        events.push(noteOff(offTicks, noteChannel, trigNote));
      }
    }
    barOffset += seqBars;
  }
  events.push(endOfTrack(barOffset * TICKS_PER_BAR));
  return events;
}

function buildBassTrack(name, channel, slots, fixedPatterns, seqBars, fadeMode, fadeSteps) {
  // Bass notes (Hz → MIDI pitch, velocity from the accent lane) plus
  // TRACK LEVEL (CC 95) ramps from bassVol. The A4's filter / drive /
  // delay-send are NRPN-only, so the FLTR/DRV/Dly slider automation is
  // deliberately NOT exported (see header note).
  const events = [trackName(0, name)];
  pushRoleInitCCs(events, channel);
  let barOffset = 0;
  let prevVol = null;
  for (const slot of slots) {
    const pat = slotPattern(slot, fixedPatterns);
    const muted = slot.channels?.bassMute;
    const volValue = unitToCC(slot.channels?.bassVol ?? 0.8);
    const slotStartTicks = barOffset * TICKS_PER_BAR;

    prevVol = emitCCWithRamp(events, channel, 95, volValue, prevVol, slotStartTicks, fadeMode, fadeSteps);

    for (let bar = 0; bar < seqBars; bar++) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        const freq = pat.bass?.[step] || 0;
        if (freq <= 0 || muted) continue;
        const velocity = unitToCC(pat.accent?.[step] ?? 0.8);
        const pitch = hzToMidi(freq);
        const onTicks = slotStartTicks + bar * TICKS_PER_BAR + step * TICKS_PER_STEP;
        const offTicks = onTicks + Math.round(TICKS_PER_STEP * 0.95);
        events.push(noteOn(onTicks, channel, pitch, velocity));
        events.push(noteOff(offTicks, channel, pitch));
      }
    }
    barOffset += seqBars;
  }
  events.push(endOfTrack(barOffset * TICKS_PER_BAR));
  return events;
}

// ----- SMF assembler -----------------------------------------------------

function assembleSMF(trackEventLists) {
  // Sort each track's events by ticks (stable), then emit delta-time
  // VLQs + event bytes per event. Wrap each track in MTrk + length.
  const trackChunks = [];
  for (const events of trackEventLists) {
    events.sort((a, b) => a.ticks - b.ticks);
    const body = [];
    let prevTicks = 0;
    for (const ev of events) {
      const delta = ev.ticks - prevTicks;
      body.push(...vlq(delta));
      body.push(...ev.bytes);
      prevTicks = ev.ticks;
    }
    // MTrk header + length + body
    const len = body.length;
    trackChunks.push([
      0x4d, 0x54, 0x72, 0x6b,         // "MTrk"
      (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
      ...body,
    ]);
  }

  // MThd: 6-byte header, format 1, ntrks, division (= TPB).
  const ntrks = trackChunks.length;
  const header = [
    0x4d, 0x54, 0x68, 0x64,          // "MThd"
    0x00, 0x00, 0x00, 0x06,          // length
    0x00, 0x01,                       // format 1
    (ntrks >> 8) & 0xff, ntrks & 0xff,
    (TPB >> 8) & 0xff, TPB & 0xff,
  ];

  const all = [...header];
  for (const chunk of trackChunks) all.push(...chunk);
  return new Uint8Array(all);
}

// ----- Public entry point ------------------------------------------------

export function exportSongToMidi({
  slots,                    // array of slot objects or null (savedSlots)
  fixedPatterns,            // FIXED_PATTERNS array
  seqBars,                  // bars per slot (sequence-play setting)
  fadeMode,                 // boolean
  fadeSteps,                // number of ramp steps (typically 16)
  bpm,                      // tempo
}) {
  const filled = slots.filter((s) => s !== null && s !== undefined);
  if (filled.length === 0) {
    throw new Error("no filled slots to export");
  }
  // Normalise: ensure channels snapshot exists with defaults the ramp
  // logic expects.
  for (const slot of filled) {
    slot.channels = slot.channels || {};
    if (slot.channels.filterCut === undefined) slot.channels.filterCut = 800;
    if (slot.channels.delayMix === undefined) slot.channels.delayMix = 0.25;
    if (slot.channels.drive === undefined) slot.channels.drive = 0.3;
    if (slot.channels.bassVol === undefined) slot.channels.bassVol = 0.8;
    if (slot.channels.kickVol === undefined) slot.channels.kickVol = 0.8;
    if (slot.channels.hatVol === undefined) slot.channels.hatVol = 0.8;
    if (slot.channels.clapVol === undefined) slot.channels.clapVol = 0.8;
  }

  const trackLists = [
    buildMetaTrack(bpm),
    buildBassTrack("bass", CH.bass, filled, fixedPatterns, seqBars, fadeMode, fadeSteps),
    buildDrumNoteTrack("kick", CH.drumNotes, CH.kickCtl, filled, fixedPatterns, seqBars, TRIG.kick, "kick", "kickMute", "kickVol", fadeMode, fadeSteps),
    buildDrumNoteTrack("hihat", CH.drumNotes, CH.hihatCtl, filled, fixedPatterns, seqBars, TRIG.chat, "chat", "hatMute", "hatVol", fadeMode, fadeSteps),
    buildDrumNoteTrack("openhat", CH.drumNotes, CH.openhatCtl, filled, fixedPatterns, seqBars, TRIG.ohat, "ohat", "hatMute", "hatVol", fadeMode, fadeSteps),
    buildDrumNoteTrack("clap", CH.drumNotes, CH.clapCtl, filled, fixedPatterns, seqBars, TRIG.clap, "clap", "clapMute", "clapVol", fadeMode, fadeSteps),
  ];
  return assembleSMF(trackLists);
}

// Browser-side convenience: trigger a download of the bytes as a .mid file.
export function downloadMidiBlob(bytes, filename = "born-slippy-song.mid") {
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
