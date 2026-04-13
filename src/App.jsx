import { useState, useRef, useCallback, useEffect } from "react";

const BPM = 133;
const STEP_TIME = 60 / BPM / 4;
const STEPS = 16;

const WHOLE_TONE_DOWN = 1 / Math.pow(2, 2 / 12);
const MINOR_THIRD_UP = Math.pow(2, 3 / 12);

// Unique colors for the 4 fixed patterns
const PATTERN_COLORS = ["#e05020", "#20a0e0", "#20c060", "#9040c0"];

// Random color palette — must not overlap with PATTERN_COLORS
const RND_COLORS = [
  "#8020e0", "#e02080", "#e0a020",
  "#e04040", "#6060e0", "#e06020", "#20e0b0", "#b020e0",
  "#e02020", "#e0e020", "#60e020", "#e020c0",
  "#20e0e0", "#a0e020", "#e08060", "#8060e0", "#e06080",
];

const NOTE_FREQS = {
  E1: 41.20, F1: 43.65, G1: 49.00, A1: 55.00, B1: 61.74,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, Fs2: 92.50,
  G2: 98.00, A2: 110.0, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81,
};

const SCALE_POOLS = [
  [NOTE_FREQS.E2, NOTE_FREQS.G2, NOTE_FREQS.A2, NOTE_FREQS.B2, NOTE_FREQS.D2],
  [NOTE_FREQS.E2, NOTE_FREQS.Fs2, NOTE_FREQS.G2, NOTE_FREQS.A2, NOTE_FREQS.B2, NOTE_FREQS.C3, NOTE_FREQS.D3],
  [NOTE_FREQS.E2, NOTE_FREQS.G2, NOTE_FREQS.B2, NOTE_FREQS.E3],
  [NOTE_FREQS.E2, NOTE_FREQS.B2, NOTE_FREQS.E3, NOTE_FREQS.A2],
  [NOTE_FREQS.E2, NOTE_FREQS.F2, NOTE_FREQS.G2, NOTE_FREQS.Bb2, NOTE_FREQS.D2],
];

const KICK_TEMPLATES = [
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[1,0,0,0.2,1,0,0,0,1,0,0,0.2,1,0,0,0],
  [1,0,0,0,1,0,0.3,0,1,0,0,0,1,0,0.3,0],[1,0,0,0,1,0,0,0,0,0,0.4,0,1,0,0,0],
  [1,0.5,0,0,1,0,0,0,1,0.5,0,0,1,0,0,0],[1,0,0,0,0,0,0,0,1,0,0,0.3,0,0,0.4,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0.3],
];
const HAT_TEMPLATES = {
  open: [[0,0,0.6,0,0,0,0.7,0,0,0,0.6,0,0,0,0.7,0],[0,0,0,0,0,0,0.6,0,0,0,0,0,0,0,0.7,0],[0,0,0.5,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.5],[0,0,0,0,0,0,0.5,0,0,0,0,0,0,0,0.5,0.3]],
  closed: [[0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],[0.4,0,0.3,0,0.4,0,0.3,0,0.4,0,0.3,0,0.4,0,0.3,0],[0.3,0.2,0.15,0.25,0.3,0.15,0.2,0.3,0.3,0.2,0.15,0.25,0.3,0.15,0.25,0.2],[0.25,0,0,0,0.25,0,0,0,0.25,0,0,0,0.25,0,0,0],[0.3,0,0.2,0.15,0,0.2,0,0.15,0.3,0,0.2,0.15,0,0.2,0,0.15]],
};
const CLAP_TEMPLATES = [[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0.2,0,0,0,0,1,0,0,0.3],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0.3,0,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0.2]];

function generateBassLine() {
  const pool = SCALE_POOLS[Math.floor(Math.random() * SCALE_POOLS.length)];
  const root = pool[0]; const bass = new Array(16); const accent = new Array(16);
  const st = Math.random();
  if (st < 0.25) {
    const alt = pool[Math.floor(Math.random() * pool.length)];
    for (let i = 0; i < 16; i++) { bass[i] = (i===6||i===7||i===14) ? alt : root; accent[i] = i%4===0 ? 1 : 0.15+Math.random()*0.3; }
  } else if (st < 0.5) {
    const riff = [];
    for (let i = 0; i < 8; i++) { if (i%4===0) riff.push(root); else if (Math.random()<0.35) riff.push(0); else riff.push(pool[Math.floor(Math.random()*pool.length)]); }
    for (let i = 0; i < 16; i++) { bass[i] = riff[i%8]; accent[i] = i%4===0 ? 1 : (bass[i]===0 ? 0 : 0.3+Math.random()*0.5); }
  } else if (st < 0.75) {
    let cn = 0;
    for (let i = 0; i < 16; i++) { if (i%4===0) cn=0; else { const m=Math.random(); if(m<0.35) cn=Math.min(cn+1,pool.length-1); else if(m<0.6) cn=Math.max(cn-1,0); } bass[i]=pool[cn]; accent[i]=i%4===0?1:0.2+Math.random()*0.6; }
  } else {
    for (let i = 0; i < 16; i++) { const ip=(i%8)<4; if(ip){bass[i]=i%4===0?root:pool[Math.floor(Math.random()*pool.length)];accent[i]=i%4===0?1:0.4+Math.random()*0.4;}else{bass[i]=Math.random()<0.3?pool[Math.floor(Math.random()*pool.length)]:0;accent[i]=bass[i]===0?0:0.2+Math.random()*0.3;} }
  }
  return { bass, accent };
}

function generateRandomPattern() {
  const { bass, accent } = generateBassLine();
  const kick=[...KICK_TEMPLATES[Math.floor(Math.random()*KICK_TEMPLATES.length)]];
  const ohat=[...HAT_TEMPLATES.open[Math.floor(Math.random()*HAT_TEMPLATES.open.length)]];
  const chat=[...HAT_TEMPLATES.closed[Math.floor(Math.random()*HAT_TEMPLATES.closed.length)]];
  const clap=[...CLAP_TEMPLATES[Math.floor(Math.random()*CLAP_TEMPLATES.length)]];
  for(let i=0;i<16;i++){if(kick[i]>0&&kick[i]<1)kick[i]*=0.8+Math.random()*0.4;if(ohat[i]>0)ohat[i]*=0.85+Math.random()*0.3;if(chat[i]>0)chat[i]*=0.85+Math.random()*0.3;}
  return { name:"RND", bass, accent, kick, ohat, chat, clap };
}

const FIXED_PATTERNS = [
  { name:"DRIVE", bass:[82.41,82.41,98.0,98.0,110.0,110.0,98.0,82.41,82.41,82.41,123.47,110.0,98.0,82.41,82.41,73.42], accent:[1,0.4,0.8,0.3,0.9,0.4,0.7,0.6,1,0.3,0.8,0.5,0.7,0.9,0.4,0.6], kick:[1,0,0,0.15,1,0,0,0,1,0,0,0.15,1,0,0.2,0], ohat:[0,0,0.5,0,0,0,0.7,0,0,0,0.5,0,0,0,0.7,0.3], chat:[0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15], clap:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] },
  { name:"BREAK", bass:[82.41,0,0,82.41,0,0,98.0,0,82.41,0,0,73.42,0,0,82.41,0], accent:[1,0,0,0.5,0,0,0.7,0,0.9,0,0,0.6,0,0,0.8,0], kick:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], ohat:[0,0,0,0,0,0,0.5,0,0,0,0,0,0,0,0.6,0], chat:[0,0,0.2,0,0,0,0,0.15,0,0,0.2,0,0,0,0,0.15], clap:[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0.4] },
  { name:"PUSH", bass:[82.41,0,98.0,82.41,110.0,0,123.47,98.0,82.41,0,98.0,110.0,123.47,98.0,82.41,0], accent:[1,0,0.7,0.4,0.9,0,0.8,0.5,1,0,0.7,0.6,0.8,0.5,0.9,0], kick:[1,0,0,0.3,1,0,0,0,0,0,1,0,1,0,0.4,0], ohat:[0,0,0.6,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.6], chat:[0.3,0.2,0,0.2,0.3,0.15,0.25,0,0.3,0.2,0,0.2,0.3,0.15,0.25,0], clap:[0,0,0,0,1,0,0,0,0,0,0.3,0,1,0,0,0.25] },
  { name:"DARK", bass:[82.41,82.41,82.41,82.41,82.41,82.41,82.41,82.41,73.42,73.42,73.42,73.42,82.41,82.41,82.41,82.41], accent:[1,0.2,0.3,0.15,0.8,0.15,0.2,0.1,0.9,0.2,0.25,0.15,1,0.15,0.3,0.2], kick:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0.2], ohat:[0,0,0,0,0,0,0.4,0,0,0,0,0,0,0,0.4,0], chat:[0.15,0,0.1,0,0.15,0,0,0,0.15,0,0.1,0,0.15,0,0,0.1], clap:[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0] },
];

function createDistortionCurve(amount) {
  const s=44100,c=new Float32Array(s);for(let i=0;i<s;i++){const x=(i*2)/s-1;c[i]=((3+amount)*x*20*(Math.PI/180))/(Math.PI+amount*Math.abs(x));}return c;
}

function persistSlots(slots) { try { localStorage.setItem("born-slippy-slots", JSON.stringify(slots)); } catch(e){} }
function loadSlotsAsync() { try { const r = localStorage.getItem("born-slippy-slots"); if(r) return Promise.resolve(JSON.parse(r)); } catch(e){} return Promise.resolve(null); }

function VerticalSlider({ label, value, onChange, min=0, max=1, color="#e05020", muted, onMute, isDark=true }) {
  const trackRef = useRef(null);
  const norm = (value-min)/(max-min);
  const dc = muted ? "#444" : color;
  const updateFromY = useCallback((clientY) => {
    const rect = trackRef.current.getBoundingClientRect();
    onChange(min + (1-Math.max(0,Math.min(1,(clientY-rect.top)/rect.height)))*(max-min));
  }, [min,max,onChange]);
  const trackBg = isDark ? "#161616" : "#e8e8e8";
  const trackBorder = isDark ? "#2a2a2a" : "#b8b8b4";
  const knobBg = isDark ? "linear-gradient(145deg, #222, #1a1a1a)" : "linear-gradient(145deg, #e2e2e2, #c8c8c8)";
  const muteBtnBg = muted ? "#e05020" : (isDark ? "#1a1a1a" : "#d9d9d9");
  const muteBtnBorder = muted ? "#e05020" : (isDark ? "#333" : "#b4b4b4");
  const muteBtnColor = muted ? "#0d0d0d" : (isDark ? "#d9d9d9" : "#2a2a2a");
  const labelColor = muted ? "#666" : (isDark ? "#ccc" : "#555");
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1, minWidth:0 }}>
      <span style={{ fontSize:8, color:labelColor, letterSpacing:1, textTransform:"uppercase", fontFamily:"'Space Mono', monospace" }}>{label}</span>
      <div ref={trackRef} style={{ width:38, height:100, borderRadius:19, background:trackBg, border:`1px solid ${trackBorder}`, position:"relative", touchAction:"none", boxShadow:"inset 0 2px 4px rgba(0,0,0,0.6)", opacity:muted?0.35:1, transition:"opacity 0.15s" }}
        onTouchStart={(e)=>{e.preventDefault();updateFromY(e.touches[0].clientY);const mv=(ev)=>{ev.preventDefault();updateFromY(ev.touches[0].clientY);};const up=()=>{document.removeEventListener("touchmove",mv);document.removeEventListener("touchend",up);};document.addEventListener("touchmove",mv,{passive:false});document.addEventListener("touchend",up);}}
        onMouseDown={(e)=>{updateFromY(e.clientY);const mv=(ev)=>updateFromY(ev.clientY);const up=()=>{document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up);};document.addEventListener("mousemove",mv);document.addEventListener("mouseup",up);}}
      >
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${norm*100}%`, borderRadius:19, background:`linear-gradient(to top, ${dc}44, ${dc}22)`, transition:"height 0.05s" }} />
        <div style={{ position:"absolute", left:"50%", bottom:`calc(${norm*100}% - 12px)`, transform:"translateX(-50%)", width:24, height:24, borderRadius:"50%", background:knobBg, border:`2px solid ${dc}`, boxShadow:`0 0 6px ${dc}33`, transition:"bottom 0.05s" }}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:5, height:5, borderRadius:"50%", background:dc, opacity:0.7 }} />
        </div>
      </div>
      {onMute && <button onClick={onMute} style={{ width:32, height:20, borderRadius:3, background:muteBtnBg, border:`1px solid ${muteBtnBorder}`, color:muteBtnColor, fontSize:7, fontWeight:700, letterSpacing:0.5, fontFamily:"'Space Mono', monospace", cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.1s", padding:0 }}>{muted?"OFF":"M"}</button>}
    </div>
  );
}

function SlotButton({ idx, filled, isActive, slotColor, onTap, onLongPress, btnBase, isDark=true }) {
  const timerRef = useRef(null);
  const c = slotColor || "#8020e0";
  const handleDown = () => { if(filled) timerRef.current = setTimeout(()=>{onLongPress();timerRef.current="deleted";}, 600); };
  const handleUp = () => { if(timerRef.current==="deleted"){timerRef.current=null;return;} if(timerRef.current)clearTimeout(timerRef.current); timerRef.current=null; onTap(); };
  const handleCancel = () => { if(timerRef.current&&timerRef.current!="deleted")clearTimeout(timerRef.current); };
  const bg = isActive ? c : filled ? `${c}38` : (isDark ? "#111" : "#f3f3f3");
  const border = `2px solid ${isActive ? c : filled ? c : (isDark ? "#222" : "#bbb")}`;
  const textColor = isActive ? "#fff" : filled ? c : (isDark ? "#ddd" : "#333");
  return (
    <button onMouseDown={handleDown} onMouseUp={handleUp} onMouseLeave={handleCancel}
      onTouchStart={(e)=>{e.preventDefault();handleDown();}} onTouchEnd={(e)=>{e.preventDefault();handleUp();}}
      style={{ ...btnBase, width:48, height:40, borderRadius:6, fontSize:11, padding:0,
        background: bg,
        border: border,
        color: textColor,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: isActive ? `0 0 10px ${c}88` : filled ? `0 0 6px ${c}44` : "none",
        userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none",
      }}
    >
      {filled ? idx+1 : <span style={{ fontSize:8, opacity:0.5 }}>{idx+1}</span>}
    </button>
  );
}

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bassVol, setBassVol] = useState(0.7);
  const [kickVol, setKickVol] = useState(0.8);
  const [hatVol, setHatVol] = useState(0.35);
  const [clapVol, setClapVol] = useState(0.5);
  const [filterCut, setFilterCut] = useState(800);
  const [delayMix, setDelayMix] = useState(0.25);
  const [drive, setDrive] = useState(0.3);
  const [selectedPattern, setSelectedPattern] = useState(0);
  const [activePattern, setActivePattern] = useState(0);
  const [patterns, setPatterns] = useState(FIXED_PATTERNS);
  const [isRandom, setIsRandom] = useState(false);
  const [currentRandom, setCurrentRandom] = useState(null);
  const [noteDown, setNoteDown] = useState(false);
  const [thirdUp, setThirdUp] = useState(false);
  const [bassMute, setBassMute] = useState(false);
  const [kickMute, setKickMute] = useState(false);
  const [hatMute, setHatMute] = useState(false);
  const [clapMute, setClapMute] = useState(false);
  const [filterMute, setFilterMute] = useState(false);
  const [delayMute, setDelayMute] = useState(false);
  const [driveMute, setDriveMute] = useState(false);
  const [savedSlots, setSavedSlots] = useState(Array(24).fill(null));
  const [activeSlot, setActiveSlot] = useState(null);
  const [rndColor, setRndColor] = useState("#8020e0");
  const [rndColorIdx, setRndColorIdx] = useState(0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('born-slippy-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiOutputs, setMidiOutputs] = useState([]);
  const [selectedMidiOutput, setSelectedMidiOutput] = useState(null);
  const midiChannels = { bass: 1, kick: 2, hats: 3, clap: 4 }; // Default channels 1-4
  const [fadeMode, setFadeMode] = useState(() => localStorage.getItem('born-slippy-fade') !== 'false');
  const [fadeSteps, setFadeSteps] = useState(16);
  const [seqPlay, setSeqPlay] = useState(false);
  const [seqBars, setSeqBars] = useState(4);
  const [seqCurrentSlot, setSeqCurrentSlot] = useState(-1);

  const ctxRef=useRef(null); const timerRef=useRef(null); const stepRef=useRef(0);
  const nodesRef=useRef({}); const activePatternRef=useRef(0);
  const pendingPatternRef=useRef(null); const pendingPatternsRef=useRef(null);
  const patternsRef=useRef(FIXED_PATTERNS);
  const pitchRef=useRef({ noteDown:false, thirdUp:false });
  const mutesRef=useRef({ bass:false, kick:false, hat:false, clap:false });
  const clapVolRef=useRef(0.5);
  const fadeActiveRef=useRef(false);
  const fadeTargetRef=useRef(null);
  const fadeStartValuesRef=useRef(null);
  const fadeStepsRef=useRef(16);
  const fadeCurrentStepRef=useRef(0);
  const fadeTimerRef=useRef(null);
  const seqModeRef=useRef(false);
  const seqBarsRef=useRef(4);
  const seqCurrentSlotRef=useRef(-1);
  const seqBarCountRef=useRef(0);
  const savedSlotsRef=useRef(Array(24).fill(null));
  const restoreSnapshotRef=useRef(null);

  useEffect(()=>{ pitchRef.current={noteDown,thirdUp}; },[noteDown,thirdUp]);
  useEffect(()=>{ patternsRef.current=patterns; },[patterns]);
  useEffect(()=>{ mutesRef.current={bass:bassMute,kick:kickMute,hat:hatMute,clap:clapMute}; },[bassMute,kickMute,hatMute,clapMute]);
  useEffect(()=>{ clapVolRef.current=clapVol; },[clapVol]);
  useEffect(() => { fadeStepsRef.current = fadeSteps; }, [fadeSteps]);
  useEffect(()=>{ seqModeRef.current=seqPlay; },[seqPlay]);
  useEffect(()=>{ seqBarsRef.current=seqBars; },[seqBars]);
  useEffect(()=>{ seqCurrentSlotRef.current=seqCurrentSlot; },[seqCurrentSlot]);
  useEffect(()=>{ savedSlotsRef.current=savedSlots; },[savedSlots]);

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(access => {
        setMidiAccess(access);
        const outputs = Array.from(access.outputs.values());
        setMidiOutputs(outputs);
        if (outputs.length > 0) setSelectedMidiOutput(outputs[0]);
      }).catch(err => console.log('MIDI access denied', err));
    }
  }, []);

  const initAudio = useCallback(() => {
    if(ctxRef.current) return ctxRef.current;
    const ctx=new(window.AudioContext||window.webkitAudioContext)(); ctxRef.current=ctx;
    const master=ctx.createGain();master.gain.value=0.85;
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.15;
    master.connect(comp);comp.connect(ctx.destination);
    const bassGain=ctx.createGain();bassGain.gain.value=bassVol;
    const bassFilter=ctx.createBiquadFilter();bassFilter.type="lowpass";bassFilter.frequency.value=filterCut;bassFilter.Q.value=6;
    const bassDistortion=ctx.createWaveShaper();bassDistortion.curve=createDistortionCurve(drive*50);bassDistortion.oversample="4x";
    bassGain.connect(bassDistortion);bassDistortion.connect(bassFilter);bassFilter.connect(master);
    const kickGain=ctx.createGain();kickGain.gain.value=kickVol;kickGain.connect(master);
    const hatGain=ctx.createGain();hatGain.gain.value=hatVol;hatGain.connect(master);
    const clapGain=ctx.createGain();clapGain.gain.value=clapVol;clapGain.connect(master);
    const delaySend=ctx.createGain();delaySend.gain.value=delayMix;
    const delay=ctx.createDelay(2);delay.delayTime.value=STEP_TIME*3;
    const delayFb=ctx.createGain();delayFb.gain.value=0.4;
    const delayFilt=ctx.createBiquadFilter();delayFilt.type="highpass";delayFilt.frequency.value=400;
    delaySend.connect(delay);delay.connect(delayFb);delayFb.connect(delay);delay.connect(delayFilt);delayFilt.connect(master);
    hatGain.connect(delaySend);bassFilter.connect(delaySend);
    nodesRef.current={master,comp,bassGain,bassFilter,bassDistortion,kickGain,hatGain,clapGain,delaySend,delay,delayFb};
    return ctx;
  },[]);

  const getPitch=useCallback(()=>{let m=1;if(pitchRef.current.noteDown)m*=WHOLE_TONE_DOWN;if(pitchRef.current.thirdUp)m*=MINOR_THIRD_UP;return m;},[]);

  const sendMidiNote = useCallback((channel, note, velocity) => {
    if (!selectedMidiOutput) return;
    const vel = Math.floor(velocity * 127);
    selectedMidiOutput.send([0x90 + channel - 1, note, vel]);
    setTimeout(() => selectedMidiOutput.send([0x80 + channel - 1, note, 0]), 100); // Note off after 100ms
  }, [selectedMidiOutput]);

  // Capture current channel state as a snapshot
  const getChannelSnapshot = useCallback(() => ({
    bassVol, kickVol, hatVol, clapVol, filterCut, delayMix, drive,
    bassMute, kickMute, hatMute, clapMute, filterMute, delayMute, driveMute,
    noteDown, thirdUp,
  }), [bassVol,kickVol,hatVol,clapVol,filterCut,delayMix,drive,bassMute,kickMute,hatMute,clapMute,filterMute,delayMute,driveMute,noteDown,thirdUp]);

  // Restore channel state from a snapshot
  const restoreChannelSnapshot = useCallback((snap) => {
    if (!snap) return;
    if (snap.bassVol !== undefined) setBassVol(snap.bassVol);
    if (snap.kickVol !== undefined) setKickVol(snap.kickVol);
    if (snap.hatVol !== undefined) setHatVol(snap.hatVol);
    if (snap.clapVol !== undefined) setClapVol(snap.clapVol);
    if (snap.filterCut !== undefined) setFilterCut(snap.filterCut);
    if (snap.delayMix !== undefined) setDelayMix(snap.delayMix);
    if (snap.drive !== undefined) setDrive(snap.drive);
    if (snap.bassMute !== undefined) setBassMute(snap.bassMute);
    if (snap.kickMute !== undefined) setKickMute(snap.kickMute);
    if (snap.hatMute !== undefined) setHatMute(snap.hatMute);
    if (snap.clapMute !== undefined) setClapMute(snap.clapMute);
    if (snap.filterMute !== undefined) setFilterMute(snap.filterMute);
    if (snap.delayMute !== undefined) setDelayMute(snap.delayMute);
    if (snap.driveMute !== undefined) setDriveMute(snap.driveMute);
    if (snap.noteDown !== undefined) setNoteDown(snap.noteDown);
    if (snap.thirdUp !== undefined) setThirdUp(snap.thirdUp);
  }, []);
  useEffect(()=>{ restoreSnapshotRef.current=restoreChannelSnapshot; },[restoreChannelSnapshot]);

  const startFade = useCallback((targetChannels) => {
    fadeStartValuesRef.current = getChannelSnapshot();
    fadeTargetRef.current = targetChannels;
    fadeCurrentStepRef.current = fadeStepsRef.current;
    fadeActiveRef.current = true;
    const timer = setInterval(() => {
      fadeCurrentStepRef.current--;
      if (fadeCurrentStepRef.current <= 0) {
        restoreChannelSnapshot(fadeTargetRef.current);
        fadeActiveRef.current = false;
        fadeTargetRef.current = null;
        fadeStartValuesRef.current = null;
        clearInterval(timer);
        fadeTimerRef.current = null;
        return;
      }
      const progress = (fadeStepsRef.current - fadeCurrentStepRef.current) / fadeStepsRef.current;
      const start = fadeStartValuesRef.current;
      const target = fadeTargetRef.current;
      if (target.bassVol !== undefined) setBassVol(start.bassVol + (target.bassVol - start.bassVol) * progress);
      if (target.kickVol !== undefined) setKickVol(start.kickVol + (target.kickVol - start.kickVol) * progress);
      if (target.hatVol !== undefined) setHatVol(start.hatVol + (target.hatVol - start.hatVol) * progress);
      if (target.clapVol !== undefined) setClapVol(start.clapVol + (target.clapVol - start.clapVol) * progress);
      if (target.filterCut !== undefined) setFilterCut(start.filterCut + (target.filterCut - start.filterCut) * progress);
      if (target.delayMix !== undefined) setDelayMix(start.delayMix + (target.delayMix - start.delayMix) * progress);
      if (target.drive !== undefined) setDrive(start.drive + (target.drive - start.drive) * progress);
    }, STEP_TIME * 1000);
    fadeTimerRef.current = timer;
  }, [getChannelSnapshot, restoreChannelSnapshot, fadeSteps]);

  const playBass=useCallback((ctx,time,freq,accent)=>{
    if(freq===0||mutesRef.current.bass)return;const f=freq*getPitch();
    sendMidiNote(midiChannels.bass, 33, accent); // Send MIDI note for bass
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),env=ctx.createGain();
    o.type="sawtooth";o.frequency.setValueAtTime(f,time);o2.type="square";o2.frequency.setValueAtTime(f*1.002,time);o2.detune.setValueAtTime(-8,time);
    env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(accent*0.35,time+0.008);
    env.gain.exponentialRampToValueAtTime(accent*0.18,time+0.06);env.gain.exponentialRampToValueAtTime(0.001,time+STEP_TIME*0.9);
    o.connect(env);o2.connect(env);env.connect(nodesRef.current.bassGain);o.start(time);o2.start(time);o.stop(time+STEP_TIME);o2.stop(time+STEP_TIME);
  },[getPitch, sendMidiNote, midiChannels.bass]);

  const playKick=useCallback((ctx,time,vel)=>{
    if(mutesRef.current.kick)return;
    sendMidiNote(midiChannels.kick, 36, vel); // Send MIDI note for kick
    const o=ctx.createOscillator(),env=ctx.createGain();
    o.type="sine";o.frequency.setValueAtTime(150,time);o.frequency.exponentialRampToValueAtTime(42,time+0.07);
    env.gain.setValueAtTime(vel*0.9,time);env.gain.exponentialRampToValueAtTime(0.001,time+0.35);
    const cl=ctx.createOscillator(),ce=ctx.createGain();cl.type="triangle";cl.frequency.setValueAtTime(3500,time);cl.frequency.exponentialRampToValueAtTime(200,time+0.02);
    ce.gain.setValueAtTime(vel*0.4,time);ce.gain.exponentialRampToValueAtTime(0.001,time+0.015);
    o.connect(env);env.connect(nodesRef.current.kickGain);cl.connect(ce);ce.connect(nodesRef.current.kickGain);
    o.start(time);o.stop(time+0.4);cl.start(time);cl.stop(time+0.03);
  },[sendMidiNote, midiChannels.kick]);

  const playHat=useCallback((ctx,time,vel,open)=>{
    if(mutesRef.current.hat)return;
    const note = open ? 46 : 42; // Open hat 46, closed 42
    sendMidiNote(midiChannels.hats, note, vel); // Send MIDI note for hats
    const sz=ctx.sampleRate*(open?0.15:0.04);
    const buf=ctx.createBuffer(1,sz,ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource();src.buffer=buf;const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=open?8000:10000;bp.Q.value=open?1.5:2;
    const env=ctx.createGain();env.gain.setValueAtTime(vel*0.4,time);env.gain.exponentialRampToValueAtTime(0.001,time+(open?0.12:0.035));
    src.connect(bp);bp.connect(env);env.connect(nodesRef.current.hatGain);src.start(time);
  },[sendMidiNote, midiChannels.hats]);

  const playClap=useCallback((ctx,time,vel)=>{
    if(mutesRef.current.clap)return;
    sendMidiNote(midiChannels.clap, 39, vel || 1); // Send MIDI note for clap
    const vol=clapVolRef.current*(vel||1);
    for(let j=0;j<3;j++){const t=time+j*0.008;const sz=ctx.sampleRate*0.02;const buf=ctx.createBuffer(1,sz,ctx.sampleRate);const d=buf.getChannelData(0);
    for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource();src.buffer=buf;
    const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1200;bp.Q.value=2;
    const env=ctx.createGain();env.gain.setValueAtTime(vol*0.35,t);env.gain.exponentialRampToValueAtTime(0.001,t+0.08);
    src.connect(bp);bp.connect(env);env.connect(nodesRef.current.clapGain);src.start(t);}
  },[sendMidiNote, midiChannels.clap]);

  const scheduleStep=useCallback((ctx,step,time)=>{
    const s=step%STEPS;
    if(s===0){
      if(pendingPatternRef.current!==null){activePatternRef.current=pendingPatternRef.current;pendingPatternRef.current=null;const p=activePatternRef.current;setTimeout(()=>setActivePattern(p),0);}
      if(pendingPatternsRef.current!==null){patternsRef.current=pendingPatternsRef.current;const pp=pendingPatternsRef.current;pendingPatternsRef.current=null;setTimeout(()=>setPatterns(pp),0);}
      if(seqModeRef.current){
        seqBarCountRef.current++;
        if(seqBarCountRef.current>=seqBarsRef.current){
          seqBarCountRef.current=0;
          const slots=savedSlotsRef.current;
          const cur=seqCurrentSlotRef.current;
          const start=(cur<0?0:(cur+1))%24;
          for(let i=0;i<24;i++){
            const idx=(start+i)%24;
            if(slots[idx]!==null){
              seqCurrentSlotRef.current=idx;
              const slot=slots[idx];
              const arr=slot.fixedIndex>=0?FIXED_PATTERNS:[...FIXED_PATTERNS,slot];
              const patIdx=slot.fixedIndex>=0?slot.fixedIndex:4;
              pendingPatternsRef.current=arr; pendingPatternRef.current=patIdx;
              setTimeout(()=>{
                setSeqCurrentSlot(idx); setActiveSlot(idx);
                if(restoreSnapshotRef.current) restoreSnapshotRef.current(slot.channels);
              },0);
              break;
            }
          }
        }
      }
    }
    const pat=patternsRef.current[activePatternRef.current];if(!pat)return;
    playBass(ctx,time,pat.bass[s],pat.accent[s]);if(pat.kick[s]>0)playKick(ctx,time,pat.kick[s]);
    if(pat.ohat[s]>0)playHat(ctx,time,pat.ohat[s],true);if(pat.chat[s]>0&&pat.ohat[s]===0)playHat(ctx,time,pat.chat[s],false);
    if(pat.clap[s]>0)playClap(ctx,time,pat.clap[s]);
  },[playBass,playKick,playHat,playClap]);

  const startSeq=useCallback(async ()=>{
    const ctx=initAudio();
    if(ctx.state==="suspended"||ctx.state==="interrupted") await ctx.resume();
    stepRef.current=0; pendingPatternRef.current=null; pendingPatternsRef.current=null;
    seqBarCountRef.current=0;
    if(seqModeRef.current){
      const slots=savedSlotsRef.current;
      let cur=seqCurrentSlotRef.current;
      if(cur<0||slots[cur]===null){ cur=-1; for(let i=0;i<24;i++){if(slots[i]!==null){cur=i;break;}} }
      if(cur>=0){
        const slot=slots[cur];
        seqCurrentSlotRef.current=cur; setSeqCurrentSlot(cur); setActiveSlot(cur);
        restoreSnapshotRef.current&&restoreSnapshotRef.current(slot.channels);
        const arr=slot.fixedIndex>=0?FIXED_PATTERNS:[...FIXED_PATTERNS,slot];
        const patIdx=slot.fixedIndex>=0?slot.fixedIndex:4;
        patternsRef.current=arr; setPatterns(arr); activePatternRef.current=patIdx; setActivePattern(patIdx);
      }
    } else {
      activePatternRef.current=selectedPattern; setActivePattern(selectedPattern);
    }
    let nextTime=ctx.currentTime+0.05;
    const sched=()=>{while(nextTime<ctx.currentTime+0.2){scheduleStep(ctx,stepRef.current,nextTime);const s=stepRef.current%STEPS;setTimeout(()=>setCurrentStep(s),(nextTime-ctx.currentTime)*1000);nextTime+=STEP_TIME;stepRef.current++;}timerRef.current=setTimeout(sched,100);};
    sched();setPlaying(true);
  },[initAudio,scheduleStep,selectedPattern]);

  const stopSeq=useCallback((reset=false)=>{
    if(timerRef.current)clearTimeout(timerRef.current);
    setPlaying(false);setCurrentStep(-1);
    if(reset){seqCurrentSlotRef.current=-1;setSeqCurrentSlot(-1);}
  },[]);

  const loadPats=useCallback((arr,idx)=>{
    if(playing){pendingPatternsRef.current=arr;pendingPatternRef.current=idx;}
    else{setPatterns(arr);patternsRef.current=arr;setActivePattern(idx);activePatternRef.current=idx;}
  },[playing]);

  const selectFixed=useCallback((idx)=>{setSelectedPattern(idx);setIsRandom(false);setActiveSlot(null);loadPats(FIXED_PATTERNS,idx);},[loadPats]);

  const triggerRandom=useCallback(()=>{
    const rnd=generateRandomPattern();setCurrentRandom(rnd);
    const newIdx = (rndColorIdx + 1) % RND_COLORS.length;
    setRndColorIdx(newIdx); setRndColor(RND_COLORS[newIdx]);
    const arr=[...FIXED_PATTERNS,rnd];
    setSelectedPattern(4);setIsRandom(true);setActiveSlot(null);loadPats(arr,4);
  },[loadPats, rndColorIdx]);

  const handleSlotTap=useCallback((idx)=>{
    const filled=savedSlots[idx]!==null;
    if(filled){
      if (fadeActiveRef.current) {
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeActiveRef.current = false;
        fadeTargetRef.current = null;
        fadeStartValuesRef.current = null;
        fadeTimerRef.current = null;
      }
      const slot=savedSlots[idx];
      setActiveSlot(idx);
      if (slot.fixedIndex >= 0) {
        setSelectedPattern(slot.fixedIndex);setIsRandom(false);setCurrentRandom(null);
        if (fadeMode && activeSlot !== idx) { startFade(slot.channels); } else { restoreChannelSnapshot(slot.channels); }
        loadPats(FIXED_PATTERNS, slot.fixedIndex);
      } else {
        const arr=[...FIXED_PATTERNS,slot];
        setSelectedPattern(4);setIsRandom(true);setCurrentRandom(slot);
        if(slot.color) setRndColor(slot.color);
        if (fadeMode && activeSlot !== idx) { startFade(slot.channels); } else { restoreChannelSnapshot(slot.channels); }
        loadPats(arr,4);
      }
    } else {
      let pat, color, fixedIndex = -1;
      if (!isRandom && activePattern < 4) {
        pat = FIXED_PATTERNS[activePattern];
        color = PATTERN_COLORS[activePattern];
        fixedIndex = activePattern;
      } else if (currentRandom) {
        pat = currentRandom;
        color = rndColor;
      } else {
        return;
      }
      const newSlots=[...savedSlots];
      newSlots[idx] = { ...pat, name:`S${idx+1}`, color, channels: getChannelSnapshot(), fixedIndex };
      setSavedSlots(newSlots);setActiveSlot(idx);persistSlots(newSlots);
    }
  },[savedSlots,currentRandom,patterns,activePattern,isRandom,loadPats,rndColor,getChannelSnapshot,restoreChannelSnapshot,fadeMode,startFade,activeSlot]);

  const handleSlotDelete=useCallback((idx)=>{
    const newSlots=[...savedSlots];newSlots[idx]=null;
    setSavedSlots(newSlots);if(activeSlot===idx)setActiveSlot(null);persistSlots(newSlots);
  },[savedSlots,activeSlot]);

  const toggleNoteDown = useCallback(() => {
    setNoteDown(v => { if (!v) setThirdUp(false); return !v; });
  }, []);
  const toggleThirdUp = useCallback(() => {
    setThirdUp(v => { if (!v) setNoteDown(false); return !v; });
  }, []);

  useEffect(()=>{const n=nodesRef.current;if(n.bassGain)n.bassGain.gain.value=bassVol;},[bassVol]);
  useEffect(()=>{const n=nodesRef.current;if(n.kickGain)n.kickGain.gain.value=kickVol;},[kickVol]);
  useEffect(()=>{const n=nodesRef.current;if(n.hatGain)n.hatGain.gain.value=hatVol;},[hatVol]);
  useEffect(()=>{const n=nodesRef.current;if(n.clapGain)n.clapGain.gain.value=clapVol;},[clapVol]);
  useEffect(()=>{const n=nodesRef.current;if(n.bassFilter)n.bassFilter.frequency.value=filterMute?80:filterCut;},[filterCut,filterMute]);
  useEffect(()=>{const n=nodesRef.current;if(n.delaySend)n.delaySend.gain.value=delayMute?0:delayMix;},[delayMix,delayMute]);
  useEffect(()=>{const n=nodesRef.current;if(n.bassDistortion)n.bassDistortion.curve=createDistortionCurve(driveMute?0:drive*50);},[drive,driveMute]);
  useEffect(()=>()=>{if(timerRef.current)clearTimeout(timerRef.current);if(fadeTimerRef.current)clearInterval(fadeTimerRef.current);},[]);
  useEffect(()=>{
    const resume=()=>{ if(ctxRef.current&&ctxRef.current.state!=="running") ctxRef.current.resume(); };
    document.addEventListener("visibilitychange",resume);
    return()=>document.removeEventListener("visibilitychange",resume);
  },[]);
  useEffect(()=>{ localStorage.setItem('born-slippy-theme', theme); },[theme]);
  useEffect(()=>{ localStorage.setItem('born-slippy-fade', fadeMode); },[fadeMode]);
  useEffect(()=>{ loadSlotsAsync().then(slots=>{ if(slots) setSavedSlots(slots); }); },[]);

  const displayPat=patterns[activePattern]||FIXED_PATTERNS[0];
  const getNoteName=()=>{if(noteDown)return"D";if(thirdUp)return"G";return"E";};

  const btn={fontFamily:"'Space Mono', monospace",cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.15s",fontWeight:700,textTransform:"uppercase",letterSpacing:1};

  return (
    <div style={{ minHeight:"100vh", background:theme === 'dark' ? '#0d0d0d' : '#f6f7f9', fontFamily:"'Space Mono', monospace", color:theme === 'dark' ? '#fff' : '#111', display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 10px 24px", gap:12, backgroundImage:theme === 'dark' ? "radial-gradient(circle at 50% 15%, rgba(224,80,32,0.04) 0%, transparent 60%)" : "radial-gradient(circle at 50% 15%, rgba(224,80,32,0.08) 0%, transparent 60%)", WebkitTapHighlightColor:"transparent", userSelect:"none" }}>
      <div style={{ textAlign:"center" }}>
        <h1 style={{ fontSize:14, letterSpacing:7, color:"#e05020", margin:0, fontWeight:700 }}>BORN SLIPPY</h1>
        <div style={{ fontSize:10, color:theme === 'dark' ? '#555' : '#666', letterSpacing:3, marginTop:3 }}>{BPM} BPM • {getNoteName()} MINOR</div>
      </div>

      <div style={{ display:"flex", gap:5, width:"100%", maxWidth:380 }}>
        {FIXED_PATTERNS.map((pat,idx)=>{
          const isA=activePattern===idx&&!isRandom;const isQ=selectedPattern===idx&&!isA&&playing&&!isRandom;const pc=PATTERN_COLORS[idx];
          return(<button key={idx} onClick={()=>selectFixed(idx)} style={{ ...btn, flex:1, padding:"9px 2px", borderRadius:7, fontSize:9, letterSpacing:1.5, background:isA?pc:isQ?(theme === 'dark' ? `${pc}22` : `${pc}18`):(theme === 'dark' ? "#161616" : "#dedede"), border:isQ?`2px solid ${pc}`:isA?`2px solid ${pc}`:`2px solid ${theme === 'dark' ? "#2a2a2a" : "#bbb"}`, color:isA?"#fff":isQ?pc:(theme === 'dark' ? "#666" : "#222") }}>
            {pat.name}{isQ&&<div style={{fontSize:6,marginTop:1,opacity:0.8}}>NEXT</div>}
          </button>);
        })}
      </div>

      <button onClick={triggerRandom} style={{
        ...btn, width:"100%", maxWidth:380, padding:"10px 8px", borderRadius:7, fontSize:10, letterSpacing:3,
        background: isRandom&&activePattern===4 ? rndColor : (theme === 'dark' ? "#161616" : "#dadada"),
        border: `2px solid ${isRandom ? rndColor : (theme === 'dark' ? "#2a2a2a" : "#aaa")}`,
        color: isRandom&&activePattern===4 ? "#fff" : isRandom ? rndColor : (theme === 'dark' ? "#555" : "#222"),
      }}>⟳ RANDOM</button>

      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {[0,8].map((off)=>(
          <div key={off} style={{ display:"flex", gap:4 }}>
            {Array.from({length:8}).map((_,i)=>{const step=off+i;const a=step===currentStep;
              return<div key={step} style={{ width:16, height:16, borderRadius:3, background:a?"#e05020":displayPat.kick[step]>=1?(theme === 'dark' ? "#444" : "#666"):(theme === 'dark' ? "#1e1e1e" : "#d1d1d1"), boxShadow:a?"0 0 10px rgba(224,80,32,0.7)":"none", border:step%4===0?`1px solid ${theme === 'dark' ? "#333" : "#888"}`:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#bbb"}`, transition:"background 0.04s" }} />;
            })}
          </div>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={toggleNoteDown} style={{
          ...btn, width:50, height:50, borderRadius:10, fontSize:9, letterSpacing:0.5,
          background:noteDown?"#1a2a1a":(theme === 'dark' ? "#161616" : "#d9d9d9"),
          border:`2px solid ${noteDown?"#40a040":(theme === 'dark' ? "#2a2a2a" : "#999")}`,
          color:noteDown?"#40a040":(theme === 'dark' ? "#d9d9d9" : "#222"),
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
          boxShadow:noteDown?"0 0 10px rgba(64,160,64,0.2)":"none",
        }}><span style={{fontSize:13}}>↓</span><span>NOTE</span></button>

        {(()=>{
          const playBtnRef = {t:null};
          const onDown=()=>{ playBtnRef.t=setTimeout(()=>{ playBtnRef.t="long"; playing?stopSeq(true):(() =>{seqCurrentSlotRef.current=-1;setSeqCurrentSlot(-1);})(); },600); };
          const onUp=()=>{ if(playBtnRef.t==="long"){playBtnRef.t=null;return;} if(playBtnRef.t)clearTimeout(playBtnRef.t); playBtnRef.t=null; playing?stopSeq(false):startSeq(); };
          const onCancel=()=>{ if(playBtnRef.t&&playBtnRef.t!=="long")clearTimeout(playBtnRef.t); playBtnRef.t=null; };
          return(<button
            onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onCancel}
            onTouchStart={(e)=>{e.preventDefault();onDown();}} onTouchEnd={(e)=>{e.preventDefault();onUp();}}
            style={{ ...btn, width:72, height:72, borderRadius:"50%", fontSize:24,
              background:playing?"linear-gradient(145deg, #e05020, #c04018)":"linear-gradient(145deg, #222, #1a1a1a)",
              border:`3px solid ${playing?"#e05020":"#444"}`, color:playing?"#0d0d0d":"#888",
              boxShadow:playing?"0 0 28px rgba(224,80,32,0.4)":"0 4px 10px rgba(0,0,0,0.6)",
              display:"flex", alignItems:"center", justifyContent:"center",
              userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none",
            }}>{playing?"■":"▶"}</button>);
        })()}

        <button onClick={toggleThirdUp} style={{
          ...btn, width:50, height:50, borderRadius:10, fontSize:9, letterSpacing:0.5,
          background:thirdUp?"#1a1a2a":(theme === 'dark' ? "#161616" : "#d9d9d9"),
          border:`2px solid ${thirdUp?"#4080e0":(theme === 'dark' ? "#2a2a2a" : "#999")}`,
          color:thirdUp?"#4080e0":(theme === 'dark' ? "#d9d9d9" : "#222"),
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1,
          boxShadow:thirdUp?"0 0 10px rgba(64,128,224,0.2)":"none",
        }}><span style={{fontSize:13}}>↑</span><span>III</span></button>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
          ...btn, width:50, height:50, borderRadius:10, fontSize:20,
          background:theme==='dark'?'#161616':'#e0e0e0',
          border:`2px solid ${theme==='dark'?'#444':'#ccc'}`,
          color:theme==='dark'?'#ffffff':'#666',
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>{theme === 'dark' ? '☀' : '🌙'}</button>
      </div>

      <div style={{ display:"flex", gap:2, padding:"10px 6px 6px", background:theme === 'dark' ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.06)", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, width:"100%", maxWidth:380, justifyContent:"space-around" }}>
        <VerticalSlider label="Bass" value={bassVol} onChange={setBassVol} muted={bassMute} onMute={()=>setBassMute(v=>!v)} isDark={theme === 'dark'} />
        <VerticalSlider label="Kick" value={kickVol} onChange={setKickVol} muted={kickMute} onMute={()=>setKickMute(v=>!v)} isDark={theme === 'dark'} />
        <VerticalSlider label="Hats" value={hatVol} onChange={setHatVol} muted={hatMute} onMute={()=>setHatMute(v=>!v)} isDark={theme === 'dark'} />
        <VerticalSlider label="Clap" value={clapVol} onChange={setClapVol} muted={clapMute} onMute={()=>setClapMute(v=>!v)} color="#cc4422" isDark={theme === 'dark'} />
        <VerticalSlider label="Filt" value={filterCut} onChange={setFilterCut} min={80} max={4000} color="#e08040" muted={filterMute} onMute={()=>setFilterMute(v=>!v)} isDark={theme === 'dark'} />
        <VerticalSlider label="Dly" value={delayMix} onChange={setDelayMix} color="#d06030" muted={delayMute} onMute={()=>setDelayMute(v=>!v)} isDark={theme === 'dark'} />
        <VerticalSlider label="Drv" value={drive} onChange={setDrive} color="#c04020" muted={driveMute} onMute={()=>setDriveMute(v=>!v)} isDark={theme === 'dark'} />
      </div>

      <div style={{ width:"100%", maxWidth:380, background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>
          TAP EMPTY = SAVE • TAP FILLED = RECALL • HOLD = DELETE
        </div>
        {[0,6,12,18].map((off)=>(
          <div key={off} style={{ display:"flex", gap:5, marginBottom:off<18?5:0, justifyContent:"center" }}>
            {Array.from({length:6}).map((_,i)=>{const idx=off+i;
              const isSeqActive=seqPlay&&seqCurrentSlot===idx;
              return(<SlotButton key={idx} idx={idx}
                filled={savedSlots[idx]!==null} isActive={activeSlot===idx||isSeqActive}
                slotColor={savedSlots[idx]?.color || rndColor}
                onTap={()=>handleSlotTap(idx)} onLongPress={()=>handleSlotDelete(idx)} btnBase={btn} isDark={theme === 'dark'}
              />);
            })}
          </div>
        ))}
      </div>

      <div style={{ width:"100%", maxWidth:380, background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>
          EXPERIMENTAL: PRESET FADE
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
            <input type="checkbox" checked={fadeMode} onChange={(e) => setFadeMode(e.target.checked)} style={{ marginRight:4 }} />
            Enable Fade
          </label>
          <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
            Steps: <input type="number" min="1" max="64" value={fadeSteps} onChange={(e) => setFadeSteps(parseInt(e.target.value) || 16)} style={{ width:50, background:theme === 'dark' ? "#1a1a1a" : "#fff", border:`1px solid ${theme === 'dark' ? "#333" : "#ccc"}`, color:theme === 'dark' ? "#ccc" : "#000", fontSize:10, padding:2, borderRadius:3 }} />
          </label>
        </div>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center" }}>
          Fade time: {(fadeSteps * STEP_TIME * 1000).toFixed(0)}ms ({fadeSteps} steps)
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:380, background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>
          EXPERIMENTAL: SEQUENCE PLAY
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
            <input type="checkbox" checked={seqPlay} onChange={(e) => setSeqPlay(e.target.checked)} style={{ marginRight:4 }} />
            Play slots in sequence
          </label>
          <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
            Bars: <input type="number" min="1" max="64" value={seqBars} onChange={(e) => setSeqBars(parseInt(e.target.value) || 4)} style={{ width:44, background:theme === 'dark' ? "#1a1a1a" : "#fff", border:`1px solid ${theme === 'dark' ? "#333" : "#ccc"}`, color:theme === 'dark' ? "#ccc" : "#000", fontSize:10, padding:2, borderRadius:3 }} />
          </label>
        </div>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center" }}>
          {seqPlay ? `Each slot plays ${seqBars} bar${seqBars>1?"s":""} • TAP STOP = pause • HOLD STOP = reset to slot 1` : "Enable to auto-advance through filled memory slots"}
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:380, background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>
          MIDI OUTPUT
        </div>
        <select onChange={(e) => setSelectedMidiOutput(midiOutputs.find(o => o.id === e.target.value) || null)} value={selectedMidiOutput?.id || ''} style={{ width:"100%", background:theme === 'dark' ? "#1a1a1a" : "#fff", border:`1px solid ${theme === 'dark' ? "#333" : "#ccc"}`, color:theme === 'dark' ? "#ccc" : "#000", fontSize:10, padding:4, borderRadius:4 }}>
          <option value=''>No MIDI Output</option>
          {midiOutputs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center", marginTop:6 }}>
          Channels: Bass Ch{midiChannels.bass}, Kick Ch{midiChannels.kick}, Hats Ch{midiChannels.hats}, Clap Ch{midiChannels.clap}
        </div>
      </div>
    </div>
  );
}
