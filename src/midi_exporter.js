// Born Slippy → CAT plugin import contract.
//
// Hand-rolled Standard MIDI File (SMF type 1) writer. Walks the filled
// slots in slot-machine order, lays each one out as `seqBars` bars of
// notes on role-named tracks (drums / bass / pad / lead) plus CC
// automation (filter cutoff on the bass track, master delay send on
// the master track). When `fadeMode` is on, mixer/effect values lerp
// across the slot boundary over `fadeSteps * STEP_TIME` so a CAT
// consumer reads the transition as a CC ramp.
//
// Spec: /Users/mikkel/Code/cat/spec/openspec/specs/import-system/spec.md
// § "Plugin import contract".

const TPB = 480;                  // ticks per quarter beat
const STEPS_PER_BAR = 16;         // 16th-note grid
const TICKS_PER_STEP = TPB / 4;   // 120 ticks
const TICKS_PER_BAR = TPB * 4;    // 4 quarters per bar (BS is fixed 4/4)

// Per-role MIDI channel mapping (matches train_digitone binding on Digitone).
// 0-based for SMF wire encoding.
const CH = {
  drums: 0,    // t1 — channel 1
  bass: 1,     // t2 — channel 2
  pad: 2,      // t3 — channel 3
  lead: 3,     // t4 — channel 4
  master: 9,   // auto channel 10
};

// Drum pitch assignments (General-MIDI flavour, matches the spec's
// translation table). Kick on drums; closed + open hats on pad; clap
// on lead.
const PITCH = { kick: 36, chat: 42, ohat: 46, clap: 39 };

// ----- Utilities ---------------------------------------------------------

function hzToMidi(freq) {
  // round(69 + 12 * log2(freq / 440))
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

function filterHzToCC(hz) {
  // Log scale 50 Hz → 0, 3000 Hz → 127, clamped.
  const min = 50, max = 3000;
  const x = Math.max(min, Math.min(max, hz));
  return Math.round((Math.log2(x / min) / Math.log2(max / min)) * 127);
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

// Default per-role anchor: every export plants track_mute=0 and
// track_level=100 at delta 0 on the role's own channel so the
// playback is audible regardless of whatever state the device was
// left in. Slot-level mute/volume overrides come later.
function pushRoleInitCCs(events, channel) {
  events.push(cc(0, channel, 94, 0));     // track_mute = unmuted
  events.push(cc(0, channel, 95, 100));   // track_level ~= 78% of full
}

function buildMetaTrack(bpm) {
  return [
    timeSig(0, 4, 2),
    setTempo(0, bpm),
    endOfTrack(0),
  ];
}

function buildDrumNoteTrack(name, channel, slots, fixedPatterns, seqBars, kickPitch) {
  // One note per non-zero step. velocity = round(stepValue * 127).
  const events = [trackName(0, name)];
  pushRoleInitCCs(events, channel);
  let barOffset = 0;
  for (const slot of slots) {
    const pat = slotPattern(slot, fixedPatterns);
    const muteFlag = pat.kick && slot.channels?.kickMute;  // mute is per-track
    for (let bar = 0; bar < seqBars; bar++) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        const v = pat.kick?.[step] || 0;
        if (v <= 0 || muteFlag) continue;
        const onTicks = (barOffset + bar) * TICKS_PER_BAR + step * TICKS_PER_STEP;
        const offTicks = onTicks + Math.round(TICKS_PER_STEP * 0.95);
        events.push(noteOn(onTicks, channel, kickPitch, unitToCC(v)));
        events.push(noteOff(offTicks, channel, kickPitch));
      }
    }
    barOffset += seqBars;
  }
  events.push(endOfTrack(barOffset * TICKS_PER_BAR));
  return events;
}

function buildHatNoteTrack(name, channel, slots, fixedPatterns, seqBars) {
  // Two layers — closed + open. Both on the same MIDI channel with
  // GM-style different pitches so a single Digitone track can
  // distinguish them (or treat them as the same hi-hat voice — the
  // pad sound on t3 typically responds to whatever pitch comes in).
  const events = [trackName(0, name)];
  pushRoleInitCCs(events, channel);
  let barOffset = 0;
  for (const slot of slots) {
    const pat = slotPattern(slot, fixedPatterns);
    const muted = slot.channels?.hatMute;
    for (let bar = 0; bar < seqBars; bar++) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        const onTicks = (barOffset + bar) * TICKS_PER_BAR + step * TICKS_PER_STEP;
        const offTicks = onTicks + Math.round(TICKS_PER_STEP * 0.95);
        if (!muted) {
          const ch_v = pat.chat?.[step] || 0;
          if (ch_v > 0) {
            events.push(noteOn(onTicks, channel, PITCH.chat, unitToCC(ch_v)));
            events.push(noteOff(offTicks, channel, PITCH.chat));
          }
          const oh_v = pat.ohat?.[step] || 0;
          if (oh_v > 0) {
            events.push(noteOn(onTicks, channel, PITCH.ohat, unitToCC(oh_v)));
            events.push(noteOff(offTicks, channel, PITCH.ohat));
          }
        }
      }
    }
    barOffset += seqBars;
  }
  events.push(endOfTrack(barOffset * TICKS_PER_BAR));
  return events;
}

function buildBassTrack(name, channel, slots, fixedPatterns, seqBars, fadeMode, fadeSteps) {
  // Notes (bass freq → MIDI pitch) PLUS automation on this same track:
  //   CC 23 (filter_frequency) ramped between slots when fadeMode is on.
  const events = [trackName(0, name)];
  pushRoleInitCCs(events, channel);
  let barOffset = 0;
  let prevFilter = null;
  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s];
    const pat = slotPattern(slot, fixedPatterns);
    const muted = slot.channels?.bassMute;
    const filterValue = filterHzToCC(slot.channels?.filterCut ?? 800);

    const slotStartTicks = barOffset * TICKS_PER_BAR;

    // Filter CC: ramp from prev → this if fading; otherwise plant a
    // single anchor at slot start.
    if (prevFilter === null) {
      events.push(cc(slotStartTicks, channel, 23, filterValue));
    } else if (fadeMode && prevFilter !== filterValue) {
      const rampTicks = Math.round(fadeSteps * (TICKS_PER_STEP / 1));  // STEP_TIME unit = 16th note
      const startRamp = Math.max(0, slotStartTicks - rampTicks);
      rampCC(events, channel, 23, startRamp, slotStartTicks, prevFilter, filterValue, fadeSteps);
    } else {
      events.push(cc(slotStartTicks, channel, 23, filterValue));
    }
    prevFilter = filterValue;

    // Notes.
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

function buildMasterTrack(name, channel, slots, seqBars, fadeMode, fadeSteps) {
  // Delay send CC 27 on auto channel (10). Same ramp logic as filter.
  const events = [trackName(0, name)];
  let barOffset = 0;
  let prevDelay = null;
  for (const slot of slots) {
    const delayValue = unitToCC(slot.channels?.delayMix ?? 0.25);
    const slotStartTicks = barOffset * TICKS_PER_BAR;

    if (prevDelay === null) {
      events.push(cc(slotStartTicks, channel, 27, delayValue));
    } else if (fadeMode && prevDelay !== delayValue) {
      const rampTicks = Math.round(fadeSteps * TICKS_PER_STEP);
      const startRamp = Math.max(0, slotStartTicks - rampTicks);
      rampCC(events, channel, 27, startRamp, slotStartTicks, prevDelay, delayValue, fadeSteps);
    } else {
      events.push(cc(slotStartTicks, channel, 27, delayValue));
    }
    prevDelay = delayValue;

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
  }

  const trackLists = [
    buildMetaTrack(bpm),
    buildDrumNoteTrack("drums", CH.drums, filled, fixedPatterns, seqBars, PITCH.kick),
    buildBassTrack("bass", CH.bass, filled, fixedPatterns, seqBars, fadeMode, fadeSteps),
    buildHatNoteTrack("pad", CH.pad, filled, fixedPatterns, seqBars),
    buildDrumNoteTrack("lead", CH.lead, filled, fixedPatterns, seqBars, PITCH.clap),
    buildMasterTrack("master", CH.master, filled, seqBars, fadeMode, fadeSteps),
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
