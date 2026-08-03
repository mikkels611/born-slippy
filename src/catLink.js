// CAT gateway link — Born Slippy side of cat change 013.
//
// Speaks gateway protocol v1 (JSON over WebSocket, localhost) to a
// running `cat gateway`. Exposes a Web-MIDI-shaped pseudo-output so the
// app's existing raw-byte send path plugs in unchanged: NoteOn bytes on
// the app's fixed channels translate to lane events (lanes, not
// channels, cross the wire — CAT owns hardware routing). NoteOffs and
// CC are dropped (the gateway owns note lengths). Transport (013
// amendment C): Start/Stop bytes become one `transport` message with
// the session BPM — the gateway generates its own steady 24 ppqn clock
// (browser clock ticks are jitter-bound and are swallowed here).

export const CAT_OUTPUT_ID = '__cat__';
const DEFAULT_URL = 'ws://127.0.0.1:8766/ws';
const RECONNECT_MS = 2000;
const WATCHDOG_MS = 3000; // gateway heartbeats every 1s

class CatLink {
  constructor() {
    this.status = 'off'; // off | connecting | connected | error
    this.routes = null;
    this.binding = null;
    this.lastError = null;
    this._ws = null;
    this._url = DEFAULT_URL;
    this._enabled = false;
    this._listeners = new Set();
    this._watchdog = null;
    this._reconnectTimer = null;
    this._pendingControls = new Map();
    this._controlTimer = null;
    this.bpm = null; // App keeps this current; sent with transport start
    this.output = {
      id: CAT_OUTPUT_ID,
      name: 'CAT (localhost)',
      send: (bytes) => this._sendBytes(bytes),
    };
  }

  subscribe(fn) {
    this._listeners.add(fn);
    fn(this._snapshot());
    return () => this._listeners.delete(fn);
  }

  _snapshot() {
    return {
      status: this.status,
      routes: this.routes,
      binding: this.binding,
      lastError: this.lastError,
    };
  }

  _emit() {
    const s = this._snapshot();
    this._listeners.forEach((fn) => fn(s));
  }

  connect(url = DEFAULT_URL) {
    this._enabled = true;
    this._url = url;
    this._open();
  }

  disconnect() {
    this._enabled = false;
    clearTimeout(this._reconnectTimer);
    clearTimeout(this._watchdog);
    if (this._ws) { this._ws.close(); this._ws = null; }
    this.status = 'off';
    this.routes = null;
    this.lastError = null;
    this._emit();
  }

  _open() {
    if (!this._enabled || this._ws) return;
    this.status = 'connecting';
    this._emit();
    let ws;
    try {
      ws = new WebSocket(this._url);
    } catch (e) {
      this._down(String(e));
      return;
    }
    this._ws = ws;
    ws.onopen = () => {
      this.status = 'connected';
      this.lastError = null;
      this._emit();
      this._json({
        type: 'hello',
        app: 'born-slippy',
        version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
      });
      this._json({ type: 'routing.request' });
      this._kickWatchdog();
    };
    ws.onmessage = (ev) => {
      this._kickWatchdog();
      this._handle(ev.data);
    };
    ws.onclose = (ev) => {
      this._ws = null;
      this._down(ev.reason || 'gateway not reachable — is `cat gateway` running?');
    };
    ws.onerror = () => {}; // onclose follows with the useful info
  }

  _down(reason) {
    clearTimeout(this._watchdog);
    if (!this._enabled) return;
    this.status = 'error';
    this.routes = null;
    this.lastError = reason;
    this._emit();
    this._reconnectTimer = setTimeout(() => this._open(), RECONNECT_MS);
  }

  _kickWatchdog() {
    clearTimeout(this._watchdog);
    this._watchdog = setTimeout(() => {
      if (this._ws) this._ws.close(); // silence → force reconnect cycle
    }, WATCHDOG_MS);
  }

  _handle(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case 'welcome':
        this.binding = msg.binding;
        this._emit();
        break;
      case 'routing.response':
        this.routes = msg.routes;
        this._emit();
        break;
      case 'warning':
      case 'error':
        this.lastError = `${msg.code}: ${msg.message}${msg.recovery ? ` — ${msg.recovery}` : ''}`;
        this._emit();
        break;
      default:
        break; // heartbeat/pong/test.result feed the watchdog above
    }
  }

  _json(obj) {
    if (this._ws && this._ws.readyState === 1) this._ws.send(JSON.stringify(obj));
  }

  test(lane) { this._json({ type: 'test', lane }); }
  refreshRouting() { this._json({ type: 'routing.request' }); }

  // Lane controls (volume / filter / drive / delay_send), value 0-1.
  // Trailing-edge throttled per (lane, control) so slider drags coalesce
  // to ~33 msgs/s instead of one per pointermove.
  control(lane, control, value) {
    this._pendingControls.set(`${lane}:${control}`, { lane, control, value });
    if (this._controlTimer) return;
    this._controlTimer = setTimeout(() => {
      this._controlTimer = null;
      this._pendingControls.forEach((c) => this._json({ type: 'control', ...c }));
      this._pendingControls.clear();
    }, 30);
  }

  // Send-ahead entry: the app calls this at SCHEDULING time with the
  // note's remaining delay — the gateway's asyncio timer (~1 ms) fires
  // it, replacing browser setTimeout jitter (measured up to 30 ms).
  scheduleBytes(bytes, inMs) {
    this._sendBytes(bytes, Math.max(0, Math.round(inMs)));
  }

  // App channel map: kick=1, bass=2, hats=3 (note 42 closed / 46 open), clap=4.
  _sendBytes(bytes, inMs = 0) {
    const [status, d1, d2] = bytes;
    if (status === 0xfa) { // Start -> rig-wide transport (gateway makes the clock)
      this._json({ type: 'transport', cmd: 'start', bpm: this.bpm || 120 });
      return;
    }
    if (status === 0xfc) {
      this._json({ type: 'transport', cmd: 'stop' });
      return;
    }
    if (status === 0xf8) return; // browser clock ticks: jitter, swallowed
    if ((status & 0xf0) !== 0x90 || !d2) return; // NoteOn only; drop off/CC
    const channel = (status & 0x0f) + 1;
    const ahead = inMs > 2 ? { in_ms: inMs } : {};
    if (channel === 2) {
      // 100 ms gate — parity with the app's own Web MIDI note-off, and
      // critically SHORTER than a 16th step up to 150 BPM: an overlapping
      // gate forces the mono A4 voice into legato (no envelope
      // retrigger), which sounds sloppy on driving basslines.
      this._json({ type: 'note', lane: 'bass', note: d1, velocity: d2, duration_ms: 100, ...ahead });
      return;
    }
    const lane =
      channel === 1 ? 'kick'
      : channel === 4 ? 'clap'
      : channel === 3 ? (d1 === 46 ? 'openhat' : 'hihat')
      : null;
    if (lane) this._json({ type: 'trigger', lane, velocity: d2, ...ahead });
  }
}

export const catLink = new CatLink();
