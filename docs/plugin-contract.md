# CAT Plugin Contract — for downstream creative tools

> **Vendored copy.** This file is a verbatim copy of `spec/plugin-contract.md` in the CAT repository (canonical source). Born Slippy's MIDI exporter ([src/midi_exporter.js](../src/midi_exporter.js)) targets this contract. When the canonical version and this vendored copy diverge, the canonical version wins — please open an issue in CAT to resync.

**Status**: stable as of 2026-05-14. Backwards-compatible changes only.

**Audience**: developers of external apps (Born Slippy, future web/mobile/DAW tools) who want their creative output to play through CAT on real hardware. You do not need CAT checked out to target this contract — write a Standard MIDI File following the rules below and CAT will play it.

**This file is intentionally portable.** It is a digest of two requirements in CAT's OpenSpec (`spec/openspec/specs/import-system/spec.md` § "Plugin import contract" and `spec/openspec/specs/import-system/spec.md` § "from_midi_cc — control-change automation import") plus integration guidance. Downstream repos MAY vendor a copy of this file; the canonical version lives in CAT and changes go through CAT's OpenSpec proposal process.

---

## 1. What CAT is

CAT is a Python + Rust MIDI playback engine. It owns the hard parts of dispatching music to hardware synthesizers (Elektron Digitone first; Rytm, A4, Minitaur next) — sub-millisecond timing, panic-on-disconnect safety, named per-track parameters, role-based device bindings.

CAT does **not** synthesize sound. It dispatches MIDI to hardware (or to a virtual port). The "Elektron-quality sound" comes from the connected device responding to the MIDI CAT sends.

CAT exposes two integration shapes:

1. **Import (this contract)** — a downstream tool writes a Standard MIDI File; the user runs `cat play-midi <file>.mid --binding <name>` and the music plays. This is the simplest seam and the one this document specifies.
2. **Live v1 (localhost)** — a real-time JSON-over-WebSocket protocol served by `cat gateway` on `ws://127.0.0.1:8766/ws` (CAT change 013, `spec/openspec/changes/013-born-slippy-gateway/specs/gateway-protocol/spec.md`). The client sends musical **lanes** (`bass`, `kick`, `clap`, `hihat`, `openhat`) as `note`/`trigger` events; CAT resolves lanes to hardware routes at event time and reports routing provenance. Born Slippy's reference client is `src/catLink.js`. Same-machine only in v1; Wi-Fi/LAN is a later milestone. The role model and naming match the import contract, so apps targeting either shape stay compatible with the other.

## 2. The wire format

### 2.1 File type

A **Standard MIDI File (SMF) type 1**. Every popular MIDI library can emit one (`MidiWriterJS`, `tonejs/midi`, `mido` in Python, hand-rolled in ~150 lines of JS). No CAT-specific extensions.

### 2.2 Track-name routing

Each MIDI track's name (SMF `track_name` meta-event at delta 0) MUST be matched literally against the role names in CAT's active binding. The reference binding `train_digitone` defines:

| Track name | CAT role | Digitone track | MIDI channel |
|------------|----------|----------------|--------------|
| `drums` | `drums` | t1 | 1 |
| `bass` | `bass` | t2 | 2 |
| `pad` | `pad` | t3 | 3 |
| `lead` | `lead` | t4 | 4 |
| `master` | `master` | fx (auto-channel for sends) | 10 |

Tracks whose name does not match any role are skipped with a non-fatal warning. **Multiple tracks MAY share a role name** — typically one carrying notes and one carrying CC automation. Both are dispatched.

### 2.3 Tempo

A `set_tempo` meta-event at delta 0 carries the initial tempo (microseconds per quarter note). Additional tempo changes anywhere in the file are honoured. CAT's CLI accepts an optional `--bpm` flag that overrides the file's tempo.

### 2.4 Notes

Standard `note_on` / `note_off` events on a role-named track produce notes on the role's bound device track. The MIDI channel of the note event is informational; CAT routes by role-name and uses the binding's channel.

**Drum pitch conventions** (General-MIDI flavoured) when the role is a drum role:

| Sound | MIDI pitch |
|-------|-----------:|
| kick | 36 |
| closed hi-hat | 42 |
| open hi-hat | 46 |
| clap | 39 |

**Bass / lead pitches** are real MIDI note numbers (60 = middle C). To convert a frequency in Hz: `pitch = round(69 + 12 · log2(freq / 440))`.

### 2.5 CC automation (the load-bearing addition over plain MIDI)

`control_change` events on any track encode parameter automation: filter sweeps, send levels, transition ramps, etc.

**The CC event's own MIDI channel is the dispatch channel.** Unlike notes (routed by role-name), CCs are dispatched on the channel the exporter wrote them on. This lets a single MIDI file carry both per-role CCs (e.g. filter cutoff on channel 2 for the bass track) and master CCs (e.g. delay send on channel 10 for the FX/master section) without needing one file per channel.

**Transition ramps** are expressed as dense CC events. The exporter picks the update rate (one CC per 16th-note ≈ 8.8 Hz at 133 BPM is a natural choice — that's how Born Slippy's `startFade()` runs). CAT plays the events back verbatim at their encoded musical times using absolute-deadline pacing.

### 2.6 Recommended CC mapping for Digitone

This table is the **suggested** mapping for an app targeting the first-class Digitone binding. Other bindings / devices MAY use different mappings (a `.cat.toml` sidecar can override). Apps are free to emit only the subset of automation they care about.

| Source parameter | MIDI channel | CC | Digitone parameter | Value mapping |
|------------------|--------------|----|--------------------|---------------|
| Filter cutoff (Hz) | 2 (bass) | 23 | `t2.filter_frequency` | log-Hz → 0–127 |
| Bass delay send (0–1) | 2 (bass) | 13 | `t2.delay_send` | linear 0–127 |
| Bass drive (0–1) | 2 (bass) | 9 | `t2.amp_drive` | linear 0–127 |
| Per-role volume (0–1) | per-role | 7 | `<track>.amp_volume` | linear 0–127 |
| Per-role mute | per-role | 94 | `<track>.track_mute` | 0 (un-muted) / 127 (muted) |
| Per-role track level (init anchor only) | per-role | 95 | `<track>.track_level` | linear 0–127 |
| Master reverb send (0–1) | 10 (auto) | 28 | `auto.master_reverb_send` | linear 0–127 |
| Master chorus send (0–1) | 10 (auto) | 26 | `auto.master_chorus_send` | linear 0–127 |
| Master delay send (0–1) | 10 (auto) | 27 | `auto.master_delay_send` | linear 0–127 |

Channel assignments above match the reference `train_digitone` binding. The CC numbers come from CAT's hardware-verified Digitone profile at `~/cat-library/devices/digitone.toml`.

**Volume convention.** Born Slippy currently uses **`amp_volume` (CC 7)** for the continuously-modulated per-slot volume and **`track_level` (CC 95)** only as a one-shot init anchor at delta 0 (set to ~100 to ensure audibility regardless of prior device state). The choice is intentional: `amp_volume` affects the synth voice level (audible mix change), `track_level` is the channel-strip fader (a global gain stage that the device can dim mid-performance unexpectedly). Other downstream tools MAY pick a different split; both columns are valid CC-95-vs-CC-7 targets for "volume".

**Init anchors.** The reference Born Slippy exporter emits two anchor CCs at delta 0 on every note-bearing track: `track_mute=0` (un-muted) and `track_level=100`. This makes every exported file self-contained — playback is audible regardless of where mute/level were left from a previous session. Downstream tools SHOULD do the same.

### 2.7 Optional sidecar `<song>.cat.toml`

When something cannot be expressed in standard MIDI, an optional sidecar TOML file next to the `.mid` carries it. Reserved fields:

```toml
binding = "train_digitone"

[role_overrides]
# Map non-standard track names → role names.
# E.g.: a tool that prefers "kicks" as the kick track name:
# kicks = "drums"

[per_role.bass]
# Defaults applied before the first note in the role.
# E.g.: recall a preset name, set a starting filter cutoff, etc.
```

The sidecar is **optional**. The MVP CLI requires only a `--binding` flag.

## 3. Consumer entry point

```
cat play-midi <song.mid> --binding <name> [--bpm <N>]
                                          [--library <path>]
                                          [--host <host>] [--tcp-port <port>]
                                          [--steps-per-beat <N>]
```

Internally:

1. Load the SMF; print its track / tempo / time-signature inventory.
2. Load the named binding and every device profile it references; open a bridge to cat-core; register each device.
3. For each MIDI track whose name matches a binding role: schedule the role's `play_pattern(<extracted-pattern>)` if the track has notes, AND schedule a CC dispatch coroutine that fires each CC event at its absolute musical wall-time on its MIDI channel.
4. Unmapped tracks are skipped with a warning. Zero mapped tracks → exit non-zero.
5. On clean exit or interrupt: panic the stage (silence all notes, reset per-channel CCs).

CC dispatch uses **absolute-deadline pacing** — no per-event cumulative drift, so a multi-minute song's automation lands on time at the end of the run.

## 4. Versioning and stability

The contract is committed under CAT's OpenSpec. Changes follow CAT's standard "Proposal → Design → Spec delta → Implement → Archive" loop.

Guarantees:

- The wire format described above is backwards-compatible. Future revisions MAY add optional fields or new conventions; existing fields and conventions will not change meaning.
- The `cat play-midi` CLI signature is backwards-compatible. New optional flags may be added.
- The reference CAT-side implementation may evolve (different MIDI library, different scheduler) without breaking the contract.

## 5. Reference implementation pointers

For implementors who want to look at working code (none of this is part of the contract, but it's the fastest way to validate your output):

- **CAT-side importer**: `cat.importers.from_midi_pattern` (notes) and `cat.importers.from_midi_cc` (CC events). Source: [`src/cat-py/cat/importers/midi.py`](../src/cat-py/cat/importers/midi.py).
- **CAT-side CLI**: `cat play-midi`. Source: [`src/cat-py/cat/cli/play_midi.py`](../src/cat-py/cat/cli/play_midi.py).
- **First-party producer**: Born Slippy's exporter at `/Users/mikkel/Code/born-slippy/src/midi_exporter.js` — ~250 lines, no dependencies, writes SMF type 1 directly. Use it as a reference for hand-rolled implementations.
- **Round-trip fixture**: [`examples/plugin-import-demo/`](../examples/plugin-import-demo/) contains a 2-slot song generated in Python with mido. The Python builder is a useful sanity check that your exporter is producing the same shape.

## 6. Verification recipe

For any new exporter:

1. Generate a small song (1–2 slots / sections).
2. Parse the file with the language-agnostic check: `python -c "import mido; [print(t.name, sum(1 for _ in t)) for t in mido.MidiFile('<file>.mid').tracks]"`. You should see one track per role plus optionally a meta track.
3. Run `cat play-midi <file>.mid --binding train_digitone`. Expected output names each mapped track with its trig and CC counts, lists unmapped tracks as warnings, exits 0.
4. With hardware connected, listen for: correct rhythm, correct pitches on the bass role, audible parameter motion if your file includes CC events.

## 7. How to evolve this contract

If your tool needs a capability the contract doesn't cover (new role kind, new CC convention, multi-device routing, etc.):

1. File an issue or proposal in CAT's repo under `spec/openspec/changes/<NNN>-<slug>/`.
2. Include: the use case, the proposed spec delta, backwards-compatibility analysis.
3. CAT-side maintainers review; on acceptance the spec is updated and this digest re-published.

Until then: the optional `.cat.toml` sidecar is the escape hatch for tool-specific metadata that doesn't fit standard MIDI.

---

**Canonical sources**: [`spec/openspec/specs/import-system/spec.md`](openspec/specs/import-system/spec.md) and [`spec/openspec/specs/roles-and-bindings/spec.md`](openspec/specs/roles-and-bindings/spec.md). When this digest and the OpenSpec differ, the OpenSpec wins; please open an issue if you spot drift.
