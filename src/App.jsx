import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { STEPS, WHOLE_TONE_DOWN, MINOR_THIRD_UP, RND_COLORS, getStepTime } from "./data/constants";
import { generateRandomPattern } from "./data/patterns";
import { THEME_PACKAGES, getPackageById } from "./data/themePackages";
import { persistSlots, loadSlotsAsync, exportSession, importSession } from "./data/sessionStore";
import { createDistortionCurve } from "./audio/utils";
import { loadDraft, createDraft, saveDraft, clearDraft, captureToDraft, updatePatternMeta, updateDraftMeta, updatePatternColor, addSet, deleteSet, switchSet, getDraftPatterns, getDraftColors, exportDraftAsJson, importDraftFromJson } from "./data/draftPackageStore";
import VerticalSlider from "./components/VerticalSlider";
import SlotButton from "./components/SlotButton";

export default function App() {
  // Admin mode detection
  const adminMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    return params.get('admin') === 'true';
  }, []);
  const [draft, setDraft] = useState(() => adminMode ? loadDraft() : null);
  const [editingPatternName, setEditingPatternName] = useState(null);
  const [adminMetaOpen, setAdminMetaOpen] = useState(false);
  const draftImportRef = useRef(null);
  const [captureFlash, setCaptureFlash] = useState(null);

  const [activePackage, setActivePackage] = useState(() => {
    const saved = localStorage.getItem('born-slippy-package');
    return saved ? (getPackageById(saved) || THEME_PACKAGES[0]) : THEME_PACKAGES[0];
  });
  const bpm = draft ? draft.bpm : activePackage.bpm;
  const stepTime = useMemo(() => getStepTime(bpm), [bpm]);
  const stepTimeRef = useRef(stepTime);
  const activePackageRef = useRef(activePackage);
  // Draft-aware patterns and colors for the current set
  const draftPatterns = draft ? getDraftPatterns(draft) : null;
  const draftColors = draft ? getDraftColors(draft) : null;
  const effectivePatterns = draftPatterns || activePackage.patterns;
  const effectiveColors = draftColors || activePackage.patternColors;

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
  const [patterns, setPatterns] = useState(() => {
    if (adminMode) { const d = loadDraft(); if (d) return getDraftPatterns(d); }
    return activePackage.patterns;
  });
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
  const [bassSolo, setBassSolo] = useState(false);
  const [kickSolo, setKickSolo] = useState(false);
  const [hatSolo, setHatSolo] = useState(false);
  const [clapSolo, setClapSolo] = useState(false);
  const anySolo = bassSolo || kickSolo || hatSolo || clapSolo;
  const [bassRec, setBassRec] = useState(false);
  const [kickRec, setKickRec] = useState(false);
  const [hatRec, setHatRec] = useState(false);
  const [clapRec, setClapRec] = useState(false);
  const anyRec = bassRec || kickRec || hatRec || clapRec;
  const [savedSlots, setSavedSlots] = useState(Array(24).fill(null));
  const [activeSlot, setActiveSlot] = useState(null);
  const [rndColor, setRndColor] = useState("#8020e0");
  const [rndColorIdx, setRndColorIdx] = useState(0);
  const [muteLock, setMuteLock] = useState(()=>localStorage.getItem('born-slippy-mutelock')==='true');
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('born-slippy-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [midiAccess, setMidiAccess] = useState(null);
  const [midiOutputs, setMidiOutputs] = useState([]);
  const [selectedMidiOutput, setSelectedMidiOutput] = useState(null);
  const midiChannels = { bass: 1, kick: 2, hats: 3, clap: 4 };
  const [fadeMode, setFadeMode] = useState(() => localStorage.getItem('born-slippy-fade') !== 'false');
  const [fadeSteps, setFadeSteps] = useState(16);
  const [seqPlay, setSeqPlay] = useState(()=>localStorage.getItem('born-slippy-seqplay')==='true');
  const [seqBars, setSeqBars] = useState(()=>parseInt(localStorage.getItem('born-slippy-seqbars'))||4);
  const [seqCurrentSlot, setSeqCurrentSlot] = useState(-1);
  const [seqPendingSlot, setSeqPendingSlot] = useState(-1);
  const [advanced, setAdvanced] = useState(()=>localStorage.getItem('born-slippy-advanced')==='true');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const ctxRef=useRef(null); const timerRef=useRef(null); const stepRef=useRef(0);
  const nodesRef=useRef({}); const activePatternRef=useRef(0);
  const pendingPatternRef=useRef(null); const pendingPatternsRef=useRef(null);
  const patternsRef=useRef(effectivePatterns);
  const draftRef=useRef(draft);
  useEffect(()=>{ draftRef.current=draft; },[draft]);
  const pitchRef=useRef({ noteDown:false, thirdUp:false });
  const mutesRef=useRef({ bass:false, kick:false, hat:false, clap:false });
  const clapVolRef=useRef(0.5);
  const fadeActiveRef=useRef(false);
  const fadeTargetRef=useRef(null);
  const fadeStartValuesRef=useRef(null);
  const fadeStepsRef=useRef(16);
  const fadeCurrentStepRef=useRef(0);
  const fadeTimerRef=useRef(null);
  const playingRef=useRef(false);
  const seqModeRef=useRef(false);
  const seqBarsRef=useRef(4);
  const seqCurrentSlotRef=useRef(-1);
  const seqBarCountRef=useRef(0);
  const seqPendingSlotRef=useRef(null);
  const seqPendingUIRef=useRef(null);
  const savedSlotsRef=useRef(Array(24).fill(null));
  const restoreSnapshotRef=useRef(null);
  const importFileRef=useRef(null);

  useEffect(()=>{ pitchRef.current={noteDown,thirdUp}; },[noteDown,thirdUp]);
  useEffect(()=>{ patternsRef.current=patterns; },[patterns]);
  useEffect(()=>{
    mutesRef.current={
      bass: anySolo ? !bassSolo : bassMute,
      kick: anySolo ? !kickSolo : kickMute,
      hat:  anySolo ? !hatSolo  : hatMute,
      clap: anySolo ? !clapSolo : clapMute,
    };
  },[bassMute,kickMute,hatMute,clapMute,bassSolo,kickSolo,hatSolo,clapSolo,anySolo]);
  useEffect(()=>{ clapVolRef.current=clapVol; },[clapVol]);
  useEffect(() => { fadeStepsRef.current = fadeSteps; }, [fadeSteps]);
  useEffect(()=>{ seqModeRef.current=seqPlay; },[seqPlay]);
  useEffect(()=>{ seqBarsRef.current=seqBars; },[seqBars]);
  useEffect(()=>{ seqCurrentSlotRef.current=seqCurrentSlot; },[seqCurrentSlot]);
  useEffect(()=>{ playingRef.current=playing; },[playing]);
  useEffect(()=>{ savedSlotsRef.current=savedSlots; },[savedSlots]);
  useEffect(()=>{ stepTimeRef.current=stepTime; },[stepTime]);
  useEffect(()=>{ activePackageRef.current=activePackage; },[activePackage]);

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

  const initAudio = useCallback(async () => {
    if(ctxRef.current) return ctxRef.current;
    // iOS silent switch workaround: loop a silent WAV via <audio> element to keep
    // the audio session in "playback" mode (ignores silent switch) for the entire session.
    // The looping element must stay alive — if it stops, iOS reverts to "ambient" mode.
    try {
      const sr=8000,dur=1,ns=sr*dur,ds=ns*2,h=44;
      const buf=new ArrayBuffer(h+ds),v=new DataView(buf);
      const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
      w(0,'RIFF');v.setUint32(4,36+ds,true);w(8,'WAVE');
      w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
      v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);
      v.setUint16(32,2,true);v.setUint16(34,16,true);
      w(36,'data');v.setUint32(40,ds,true);
      const blob=new Blob([buf],{type:'audio/wav'});
      const url=URL.createObjectURL(blob);
      const silence=new Audio(url);
      silence.loop=true;
      await silence.play();
    } catch(e) {}
    const ctx=new(window.AudioContext||window.webkitAudioContext)(); ctxRef.current=ctx;
    if(ctx.state==='suspended') await ctx.resume();
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
    const delay=ctx.createDelay(2);delay.delayTime.value=stepTimeRef.current*3;
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
    setTimeout(() => selectedMidiOutput.send([0x80 + channel - 1, note, 0]), 100);
  }, [selectedMidiOutput]);

  const getChannelSnapshot = useCallback(() => ({
    bassVol, kickVol, hatVol, clapVol, filterCut, delayMix, drive,
    bassMute, kickMute, hatMute, clapMute, filterMute, delayMute, driveMute,
    noteDown, thirdUp,
  }), [bassVol,kickVol,hatVol,clapVol,filterCut,delayMix,drive,bassMute,kickMute,hatMute,clapMute,filterMute,delayMute,driveMute,noteDown,thirdUp]);

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
    }, stepTimeRef.current * 1000);
    fadeTimerRef.current = timer;
  }, [getChannelSnapshot, restoreChannelSnapshot, fadeSteps]);

  const playBass=useCallback((ctx,time,freq,accent)=>{
    if(freq===0||mutesRef.current.bass)return;const f=freq*getPitch();
    sendMidiNote(midiChannels.bass, Math.round(12 * Math.log2(freq * getPitch() / 440) + 69), accent);
    const sp=activePackageRef.current.synthParams;
    const st=stepTimeRef.current;

    const o=ctx.createOscillator(),o2=ctx.createOscillator(),env=ctx.createGain();
    o.type=sp?.osc1||"sawtooth";o.frequency.setValueAtTime(f,time);
    o2.type=sp?.osc2||"square";o2.frequency.setValueAtTime(f*(sp?1.002:1.002),time);o2.detune.setValueAtTime(sp?.osc2Detune||-8,time);

    const atk=sp?.attack||0.008;
    const sus=sp?.sustainLevel||0.18;
    const dec=sp?.decay||0.06;
    env.gain.setValueAtTime(0,time);env.gain.linearRampToValueAtTime(accent*0.35,time+atk);
    env.gain.exponentialRampToValueAtTime(accent*sus,time+atk+dec);env.gain.exponentialRampToValueAtTime(0.001,time+st*0.9);

    o.connect(env);o2.connect(env);env.connect(nodesRef.current.bassGain);
    o.start(time);o2.start(time);o.stop(time+st);o2.stop(time+st);

    if(sp?.osc3){
      const o3=ctx.createOscillator(),e3=ctx.createGain();
      o3.type=sp.osc3;
      const subF=sp.osc3Octave===-1?f*0.5:f;
      o3.frequency.setValueAtTime(subF,time);
      const lvl=sp.osc3Level||0.3;
      e3.gain.setValueAtTime(0,time);e3.gain.linearRampToValueAtTime(accent*0.35*lvl,time+atk);
      e3.gain.exponentialRampToValueAtTime(accent*sus*lvl,time+atk+dec);e3.gain.exponentialRampToValueAtTime(0.001,time+st*0.9);
      o3.connect(e3);e3.connect(nodesRef.current.bassGain);o3.start(time);o3.stop(time+st);
    }
  },[getPitch, sendMidiNote, midiChannels.bass]);

  const playKick=useCallback((ctx,time,vel)=>{
    if(mutesRef.current.kick)return;
    sendMidiNote(midiChannels.kick, 36, vel);
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
    const note = open ? 46 : 42;
    sendMidiNote(midiChannels.hats, note, vel);
    const sz=ctx.sampleRate*(open?0.15:0.04);
    const buf=ctx.createBuffer(1,sz,ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource();src.buffer=buf;const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=open?8000:10000;bp.Q.value=open?1.5:2;
    const env=ctx.createGain();env.gain.setValueAtTime(vel*0.4,time);env.gain.exponentialRampToValueAtTime(0.001,time+(open?0.12:0.035));
    src.connect(bp);bp.connect(env);env.connect(nodesRef.current.hatGain);src.start(time);
  },[sendMidiNote, midiChannels.hats]);

  const playClap=useCallback((ctx,time,vel)=>{
    if(mutesRef.current.clap)return;
    sendMidiNote(midiChannels.clap, 39, vel || 1);
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
      // Apply deferred seq slot UI update now that the audio has actually switched
      if(seqPendingUIRef.current!==null){
        const {idx,slot}=seqPendingUIRef.current;
        seqPendingUIRef.current=null;
        setTimeout(()=>{
          if(!playingRef.current) return;
          setSeqCurrentSlot(idx); setActiveSlot(idx);
          if(restoreSnapshotRef.current) restoreSnapshotRef.current(slot.channels);
        },0);
      }
      if(seqModeRef.current){
        seqBarCountRef.current++;
        const pendingSlot=seqPendingSlotRef.current;
        const barsDue=seqBarCountRef.current>=seqBarsRef.current;
        if(pendingSlot!==null||barsDue){
          seqBarCountRef.current=0;
          const slots=savedSlotsRef.current;
          let nextIdx=null;
          if(pendingSlot!==null&&slots[pendingSlot]!==null){
            nextIdx=pendingSlot;
            seqPendingSlotRef.current=null;
            setTimeout(()=>setSeqPendingSlot(-1),0);
          } else {
            const cur=seqCurrentSlotRef.current;
            const start=(cur<0?0:(cur+1))%24;
            for(let i=0;i<24;i++){
              const idx=(start+i)%24;
              if(slots[idx]!==null){nextIdx=idx;break;}
            }
          }
          if(nextIdx!==null){
            seqCurrentSlotRef.current=nextIdx;
            const slot=slots[nextIdx];
            const pkgPats=draftRef.current?getDraftPatterns(draftRef.current):activePackageRef.current.patterns;
            const arr=slot.fixedIndex>=0?pkgPats:[...pkgPats,slot];
            const patIdx=slot.fixedIndex>=0?slot.fixedIndex:4;
            pendingPatternsRef.current=arr; pendingPatternRef.current=patIdx;
            // Defer UI update until the pending pattern is consumed (next s===0)
            seqPendingUIRef.current={idx:nextIdx,slot};
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
    const ctx=await initAudio();
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
        const pkgPats2=draftRef.current?getDraftPatterns(draftRef.current):activePackageRef.current.patterns;
        const arr=slot.fixedIndex>=0?pkgPats2:[...pkgPats2,slot];
        const patIdx=slot.fixedIndex>=0?slot.fixedIndex:4;
        patternsRef.current=arr; setPatterns(arr); activePatternRef.current=patIdx; setActivePattern(patIdx);
      }
    } else {
      activePatternRef.current=selectedPattern; setActivePattern(selectedPattern);
    }
    let nextTime=ctx.currentTime+0.05;
    const sched=()=>{while(nextTime<ctx.currentTime+0.2){scheduleStep(ctx,stepRef.current,nextTime);const s=stepRef.current%STEPS;setTimeout(()=>setCurrentStep(s),(nextTime-ctx.currentTime)*1000);nextTime+=stepTimeRef.current;stepRef.current++;}timerRef.current=setTimeout(sched,100);};
    playingRef.current=true;
    sched();setPlaying(true);
  },[initAudio,scheduleStep,selectedPattern]);

  const stopSeq=useCallback((reset=false)=>{
    playingRef.current=false;
    if(timerRef.current)clearTimeout(timerRef.current);
    setPlaying(false);setCurrentStep(-1);
    seqPendingSlotRef.current=null;setSeqPendingSlot(-1);
    if(reset){seqCurrentSlotRef.current=-1;setSeqCurrentSlot(-1);}
  },[]);

  const loadPats=useCallback((arr,idx)=>{
    if(playing){pendingPatternsRef.current=arr;pendingPatternRef.current=idx;}
    else{setPatterns(arr);patternsRef.current=arr;setActivePattern(idx);activePatternRef.current=idx;}
  },[playing]);

  const selectFixed=useCallback((idx)=>{
    setSelectedPattern(idx);setIsRandom(false);setActiveSlot(null);
    const pats=draft?getDraftPatterns(draft):activePackageRef.current.patterns;
    const pat=pats[idx];
    if(pat?.channels){
      const c=pat.channels;
      if(c.bassVol!==undefined) setBassVol(c.bassVol);
      if(c.kickVol!==undefined) setKickVol(c.kickVol);
      if(c.hatVol!==undefined) setHatVol(c.hatVol);
      if(c.clapVol!==undefined) setClapVol(c.clapVol);
      if(c.filterCut!==undefined) setFilterCut(c.filterCut);
      if(c.delayMix!==undefined) setDelayMix(c.delayMix);
      if(c.drive!==undefined) setDrive(c.drive);
    }
    loadPats(pats,idx);
  },[loadPats,draft]);

  const triggerRandom=useCallback(()=>{
    const pkg=activePackageRef.current;
    const curPat=patternsRef.current[activePatternRef.current];
    let locks=null;
    if(anyRec){
      locks={bass:!bassRec,kick:!kickRec,hat:!hatRec,clap:!clapRec};
    }else if(muteLock||anySolo){
      locks={bass:anySolo?!bassSolo:bassMute,kick:anySolo?!kickSolo:kickMute,hat:anySolo?!hatSolo:hatMute,clap:anySolo?!clapSolo:clapMute};
    }
    const rnd=generateRandomPattern(pkg,locks,curPat);setCurrentRandom(rnd);
    const newIdx = (rndColorIdx + 1) % RND_COLORS.length;
    setRndColorIdx(newIdx); setRndColor(RND_COLORS[newIdx]);
    const basePats=draft?getDraftPatterns(draft):pkg.patterns;
    const arr=[...basePats,rnd];
    setSelectedPattern(4);setIsRandom(true);setActiveSlot(null);loadPats(arr,4);
  },[loadPats, rndColorIdx, muteLock, bassMute, kickMute, hatMute, clapMute, anySolo, bassSolo, kickSolo, hatSolo, clapSolo, anyRec, bassRec, kickRec, hatRec, clapRec, draft]);

  const handleSlotTap=useCallback((idx)=>{
    const filled=savedSlots[idx]!==null;
    if(filled&&seqModeRef.current&&playingRef.current){
      seqPendingSlotRef.current=idx;
      setSeqPendingSlot(idx);
      return;
    }
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
      const basePats=draft?getDraftPatterns(draft):activePackage.patterns;
      if (slot.fixedIndex >= 0) {
        setSelectedPattern(slot.fixedIndex);setIsRandom(false);setCurrentRandom(null);
        if (fadeMode && activeSlot !== idx) { startFade(slot.channels); } else { restoreChannelSnapshot(slot.channels); }
        loadPats(basePats, slot.fixedIndex);
      } else {
        const arr=[...basePats,slot];
        setSelectedPattern(4);setIsRandom(true);setCurrentRandom(slot);
        if(slot.color) setRndColor(slot.color);
        if (fadeMode && activeSlot !== idx) { startFade(slot.channels); } else { restoreChannelSnapshot(slot.channels); }
        loadPats(arr,4);
      }
    } else {
      let pat, color, fixedIndex = -1;
      const basePats=draft?getDraftPatterns(draft):activePackage.patterns;
      const baseColors=draft?getDraftColors(draft):activePackage.patternColors;
      if (!isRandom && activePattern < 4) {
        pat = basePats[activePattern];
        color = baseColors[activePattern];
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
  },[savedSlots,currentRandom,patterns,activePattern,isRandom,loadPats,rndColor,getChannelSnapshot,restoreChannelSnapshot,fadeMode,startFade,activeSlot,activePackage,draft]);

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

  const handleExport = useCallback(() => {
    const settings = {
      theme,
      fadeMode,
      fadeSteps,
      seqPlay,
      seqBars,
      bpm,
      themePackageId: activePackage.id,
    };
    exportSession(savedSlots, settings);
  }, [savedSlots, theme, fadeMode, fadeSteps, seqPlay, seqBars, bpm, activePackage]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Import will replace all current patterns. Continue?')) {
      e.target.value = '';
      return;
    }
    try {
      const data = await importSession(file);
      setSavedSlots(data.slots);
      persistSlots(data.slots);
      setActiveSlot(null);
      if (data.settings) {
        if (data.settings.theme) setTheme(data.settings.theme);
        if (data.settings.fadeMode !== undefined) setFadeMode(data.settings.fadeMode);
        if (data.settings.fadeSteps) setFadeSteps(data.settings.fadeSteps);
        if (data.settings.seqPlay !== undefined) setSeqPlay(data.settings.seqPlay);
        if (data.settings.seqBars) setSeqBars(data.settings.seqBars);
        if (data.settings.themePackageId) {
          const pkg = getPackageById(data.settings.themePackageId);
          switchPackage(pkg);
        }
      }
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
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
  useEffect(()=>{ localStorage.setItem('born-slippy-seqplay', seqPlay); },[seqPlay]);
  useEffect(()=>{ localStorage.setItem('born-slippy-seqbars', seqBars); },[seqBars]);
  useEffect(()=>{ localStorage.setItem('born-slippy-mutelock', muteLock); },[muteLock]);
  useEffect(()=>{ localStorage.setItem('born-slippy-advanced', advanced); },[advanced]);
  useEffect(()=>{ loadSlotsAsync().then(slots=>{ if(slots) setSavedSlots(slots); }); },[]);

  const switchPackage = useCallback((pkg) => {
    if (playing) return;
    // In admin mode, switching package discards the current draft
    if (adminMode && draft) {
      clearDraft();
      setDraft(null);
    }
    setActivePackage(pkg);
    activePackageRef.current = pkg;
    stepTimeRef.current = getStepTime(pkg.bpm);
    setPatterns(pkg.patterns);
    patternsRef.current = pkg.patterns;
    setActivePattern(0);
    activePatternRef.current = 0;
    setSelectedPattern(0);
    setIsRandom(false);
    setCurrentRandom(null);
    setActiveSlot(null);
    localStorage.setItem('born-slippy-package', pkg.id);
    if (nodesRef.current.delay) {
      nodesRef.current.delay.delayTime.value = getStepTime(pkg.bpm) * 3;
    }
  }, [playing, draft, adminMode]);

  const displayPat=patterns[activePattern]||effectivePatterns[0];
  const effectiveKey = draft ? draft.key : activePackage.key;
  const getNoteName=()=>{
    const keyBase=effectiveKey.replace("m","");
    if(noteDown){
      const semitoneDown={"E":"D","A":"G","C":"Bb","D":"C","F":"Eb","G":"F","B":"A"};
      return semitoneDown[keyBase]||keyBase;
    }
    if(thirdUp){
      const thirdUpMap={"E":"G","A":"C","C":"Eb","D":"F","F":"Ab","G":"Bb","B":"D"};
      return thirdUpMap[keyBase]||keyBase;
    }
    return keyBase;
  };

  // Admin: capture current pattern into draft slot
  const handleCapture = useCallback((patIdx) => {
    if (!draft) return;
    const curPat = patternsRef.current[activePatternRef.current];
    if (!curPat) return;
    const snap = getChannelSnapshot();
    const setIdx = draft._activeSet || 0;
    const newDraft = captureToDraft(draft, setIdx, patIdx, curPat, snap);
    setDraft(newDraft);
    // Reload patterns from draft
    const pats = getDraftPatterns(newDraft);
    setPatterns(pats); patternsRef.current = pats;
    setCaptureFlash(patIdx);
    setTimeout(() => setCaptureFlash(null), 600);
  }, [draft, getChannelSnapshot]);

  // Admin: start editing a new draft from the active package
  const handleNewDraft = useCallback(() => {
    const d = createDraft(activePackage);
    setDraft(d);
    const pats = getDraftPatterns(d);
    setPatterns(pats); patternsRef.current = pats;
    setActivePattern(0); activePatternRef.current = 0;
    setSelectedPattern(0); setIsRandom(false);
  }, [activePackage]);

  // Admin: clear current draft
  const handleClearDraft = useCallback(() => {
    if (!confirm('Discard current draft?')) return;
    clearDraft();
    setDraft(null);
    setPatterns(activePackage.patterns); patternsRef.current = activePackage.patterns;
    setActivePattern(0); activePatternRef.current = 0;
    setSelectedPattern(0); setIsRandom(false);
  }, [activePackage]);

  // Admin: switch set
  const handleSwitchSet = useCallback((setIdx) => {
    if (!draft || playing) return;
    const newDraft = switchSet(draft, setIdx);
    setDraft(newDraft);
    const pats = getDraftPatterns(newDraft);
    setPatterns(pats); patternsRef.current = pats;
    setActivePattern(0); activePatternRef.current = 0;
    setSelectedPattern(0); setIsRandom(false);
  }, [draft, playing]);

  // Admin: add new set
  const handleAddSet = useCallback(() => {
    if (!draft) return;
    const newDraft = addSet(draft);
    setDraft(newDraft);
  }, [draft]);

  // Admin: delete current set
  const handleDeleteSet = useCallback(() => {
    if (!draft || draft.sets.length <= 1) return;
    if (!confirm('Delete this set?')) return;
    const setIdx = draft._activeSet || 0;
    const newDraft = deleteSet(draft, setIdx);
    setDraft(newDraft);
    const pats = getDraftPatterns(newDraft);
    setPatterns(pats); patternsRef.current = pats;
    setActivePattern(0); activePatternRef.current = 0;
    setSelectedPattern(0); setIsRandom(false);
  }, [draft]);

  const handlePlayPause=useCallback(()=>{
    if(playingRef.current){stopSeq(false);}else{startSeq();}
  },[stopSeq,startSeq]);
  const handleStop=useCallback(()=>{
    stopSeq(true);
    seqCurrentSlotRef.current=-1;setSeqCurrentSlot(-1);
    activePatternRef.current=0;setActivePattern(0);setSelectedPattern(0);
  },[stopSeq]);

  const btn={fontFamily:"'Space Mono', monospace",cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.15s",fontWeight:700,textTransform:"uppercase",letterSpacing:1};

  return (
    <div style={{ minHeight:"100vh", background:theme === 'dark' ? '#0d0d0d' : '#f6f7f9', fontFamily:"'Space Mono', monospace", color:theme === 'dark' ? '#fff' : '#111', display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 10px 24px", gap:12, backgroundImage:theme === 'dark' ? "radial-gradient(circle at 50% 15%, rgba(224,80,32,0.04) 0%, transparent 60%)" : "radial-gradient(circle at 50% 15%, rgba(224,80,32,0.08) 0%, transparent 60%)", WebkitTapHighlightColor:"transparent", userSelect:"none" }}>
      <div style={{ textAlign:"center" }}>
        <h1 style={{ fontSize:14, letterSpacing:7, color:effectiveColors[0], margin:0, fontWeight:700 }}>BORN SLIPPY</h1>
        <div style={{ fontSize:10, color:theme === 'dark' ? '#555' : '#666', letterSpacing:3, marginTop:3 }}>{bpm} BPM • {getNoteName()} MINOR</div>
      </div>

      {/* ADMIN BAR */}
      {adminMode && (
        <div style={{ width:"100%", maxWidth:380, background:"rgba(208,32,32,0.08)", borderRadius:10, border:"1px solid #d0202044", padding:"8px 10px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:9, color:"#d02020", letterSpacing:2, fontWeight:700 }}>ADMIN MODE</span>
            {draft ? (
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={()=>exportDraftAsJson(draft)} style={{ ...btn, fontSize:7, padding:"3px 8px", borderRadius:4, background:"#1a2a1a", border:"1px solid #40a040", color:"#40a040" }}>EXPORT</button>
                <button onClick={()=>draftImportRef.current?.click()} style={{ ...btn, fontSize:7, padding:"3px 8px", borderRadius:4, background:theme==='dark'?"#1a1a2a":"#e0e0f0", border:"1px solid #4060d0", color:"#4060d0" }}>IMPORT</button>
                <button onClick={handleClearDraft} style={{ ...btn, fontSize:7, padding:"3px 8px", borderRadius:4, background:"#2a1a1a", border:"1px solid #d04040", color:"#d04040" }}>DISCARD</button>
                <input ref={draftImportRef} type="file" accept=".json" onChange={async(e)=>{const f=e.target.files[0];if(!f)return;try{const d=await importDraftFromJson(f);setDraft(d);const pats=getDraftPatterns(d);setPatterns(pats);patternsRef.current=pats;setActivePattern(0);activePatternRef.current=0;setSelectedPattern(0);}catch(err){alert('Import failed: '+err.message);}e.target.value='';}} style={{ display:"none" }} />
              </div>
            ) : (
              <button onClick={handleNewDraft} style={{ ...btn, fontSize:7, padding:"3px 8px", borderRadius:4, background:"#1a2a1a", border:"1px solid #40a040", color:"#40a040" }}>NEW DRAFT FROM "{activePackage.name}"</button>
            )}
          </div>
          {draft && (
            <div style={{ fontSize:8, color:theme==='dark'?"#888":"#555", textAlign:"center" }}>
              Draft: {draft.name} • {draft.sets.length} set{draft.sets.length>1?"s":""} • base: {draft._baseId}
            </div>
          )}
        </div>
      )}

      <select
        value={activePackage.id}
        onChange={(e) => { const pkg = getPackageById(e.target.value); if (pkg) switchPackage(pkg); }}
        disabled={playing}
        style={{
          ...btn, width:"100%", maxWidth:380, padding:"10px 12px", borderRadius:7,
          fontSize:10, letterSpacing:2, textAlign:"center", appearance:"none", WebkitAppearance:"none",
          background:theme === 'dark' ? "#161616" : "#dedede",
          border:`2px solid ${effectiveColors[0]}`,
          color:effectiveColors[0],
          opacity:playing?0.4:1,
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='6'%3E%3Cpath d='M0 0l6 6 6-6' fill='${encodeURIComponent(theme === 'dark' ? '#666' : '#888')}' /%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
          paddingRight:32,
        }}
      >
        {THEME_PACKAGES.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name} — {pkg.bpm} BPM • {pkg.key}
          </option>
        ))}
      </select>

      {/* ADMIN: Set switcher tabs */}
      {adminMode && draft && draft.sets.length > 0 && (
        <div style={{ display:"flex", gap:4, width:"100%", maxWidth:380, alignItems:"center" }}>
          {draft.sets.map((set,si)=>{
            const isActive = si === (draft._activeSet||0);
            return(<button key={si} onClick={()=>handleSwitchSet(si)} style={{ ...btn, flex:1, padding:"6px 2px", borderRadius:6, fontSize:8, letterSpacing:1, background:isActive?"#d02020":(theme==='dark'?"#161616":"#dedede"), border:`1px solid ${isActive?"#d02020":(theme==='dark'?"#333":"#bbb")}`, color:isActive?"#fff":(theme==='dark'?"#888":"#444") }}>{set.name}</button>);
          })}
          <button onClick={handleAddSet} style={{ ...btn, width:28, padding:"6px 0", borderRadius:6, fontSize:10, background:theme==='dark'?"#161616":"#dedede", border:`1px solid ${theme==='dark'?"#333":"#bbb"}`, color:theme==='dark'?"#888":"#444" }}>+</button>
          {draft.sets.length>1&&<button onClick={handleDeleteSet} style={{ ...btn, width:28, padding:"6px 0", borderRadius:6, fontSize:10, background:"#2a1a1a", border:"1px solid #d04040", color:"#d04040" }}>−</button>}
        </div>
      )}

      {/* ADMIN: Capture row */}
      {adminMode && draft && (
        <div style={{ display:"flex", gap:5, width:"100%", maxWidth:380 }}>
          {[0,1,2,3].map(idx=>(
            <button key={idx} onClick={()=>handleCapture(idx)} style={{ ...btn, flex:1, padding:"6px 2px", borderRadius:6, fontSize:8, letterSpacing:1, background:captureFlash===idx?"#40a040":(theme==='dark'?"#0d1a0d":"#e0f0e0"), border:`1px solid ${captureFlash===idx?"#40a040":"#40a04066"}`, color:captureFlash===idx?"#fff":"#40a040", transition:"all 0.15s" }}>
              {captureFlash===idx?"✓":`⬇P${idx+1}`}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:5, width:"100%", maxWidth:380 }}>
        {effectivePatterns.map((pat,idx)=>{
          const isA=activePattern===idx&&!isRandom;const isQ=selectedPattern===idx&&!isA&&playing&&!isRandom;const pc=effectiveColors[idx];
          return(<button key={idx} onClick={()=>selectFixed(idx)} style={{ ...btn, flex:1, padding:"12px 2px", borderRadius:7, fontSize:9, letterSpacing:1.5, minHeight:48, background:isA?pc:isQ?(theme === 'dark' ? `${pc}22` : `${pc}18`):(theme === 'dark' ? "#161616" : "#dedede"), border:isQ?`2px solid ${pc}`:isA?`2px solid ${pc}`:`2px solid ${theme === 'dark' ? "#2a2a2a" : "#bbb"}`, color:isA?"#fff":isQ?pc:(theme === 'dark' ? "#666" : "#222"), display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            {adminMode && draft && editingPatternName===idx ? (
              <input
                autoFocus
                defaultValue={pat.name}
                onClick={(e)=>e.stopPropagation()}
                onBlur={(e)=>{const newDraft=updatePatternMeta(draft,draft._activeSet||0,idx,e.target.value.toUpperCase());setDraft(newDraft);setEditingPatternName(null);}}
                onKeyDown={(e)=>{if(e.key==='Enter')e.target.blur();}}
                style={{ width:"100%", background:"transparent", border:"none", color:"inherit", fontSize:9, fontWeight:700, letterSpacing:1.5, textAlign:"center", fontFamily:"'Space Mono',monospace", textTransform:"uppercase", outline:"none", padding:0 }}
              />
            ) : (
              <span onDoubleClick={adminMode&&draft?(e)=>{e.stopPropagation();setEditingPatternName(idx);}:undefined} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <span>{pat.name}</span>
                <span style={{fontSize:6,marginTop:1,opacity:isQ?0.8:0,height:8}}>{isQ?"NEXT":""}</span>
              </span>
            )}
          </button>);
        })}
      </div>

      <button onClick={triggerRandom} style={{
        ...btn, width:"100%", maxWidth:380, padding:"10px 8px", borderRadius:7, fontSize:10, letterSpacing:3,
        background: isRandom&&activePattern===4 ? rndColor : (theme === 'dark' ? "#161616" : "#dadada"),
        border: `2px solid ${isRandom ? rndColor : (theme === 'dark' ? "#2a2a2a" : "#aaa")}`,
        color: isRandom&&activePattern===4 ? "#fff" : isRandom ? rndColor : (theme === 'dark' ? "#555" : "#222"),
      }}>⟳ RANDOM</button>

      <div style={{ display:"flex", alignItems:"center", gap:6, width:"100%", maxWidth:380 }}>
        {advanced && <button onClick={toggleNoteDown} style={{
          ...btn, width:40, height:40, borderRadius:8, fontSize:8, letterSpacing:0.5,
          background:noteDown?"#1a2a1a":(theme === 'dark' ? "#161616" : "#d9d9d9"),
          border:`2px solid ${noteDown?"#40a040":(theme === 'dark' ? "#2a2a2a" : "#999")}`,
          color:noteDown?"#40a040":(theme === 'dark' ? "#d9d9d9" : "#222"),
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0,
          boxShadow:noteDown?"0 0 10px rgba(64,160,64,0.2)":"none", flexShrink:0,
        }}><span style={{fontSize:11}}>↓</span><span>NOTE</span></button>}
        <div style={{ display:"flex", flexDirection:"column", gap:3, flex:1, alignItems:"center" }}>
          {[0,8].map((off)=>(
            <div key={off} style={{ display:"flex", gap:4 }}>
              {Array.from({length:8}).map((_,i)=>{const step=off+i;const a=step===currentStep;
                return<div key={step} style={{ width:16, height:16, borderRadius:3, background:a?"#e05020":displayPat.kick[step]>=1?(theme === 'dark' ? "#444" : "#666"):(theme === 'dark' ? "#1e1e1e" : "#d1d1d1"), boxShadow:a?"0 0 10px rgba(224,80,32,0.7)":"none", border:step%4===0?`1px solid ${theme === 'dark' ? "#333" : "#888"}`:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#bbb"}`, transition:"background 0.04s" }} />;
              })}
            </div>
          ))}
        </div>
        {advanced && <button onClick={toggleThirdUp} style={{
          ...btn, width:40, height:40, borderRadius:8, fontSize:8, letterSpacing:0.5,
          background:thirdUp?"#1a1a2a":(theme === 'dark' ? "#161616" : "#d9d9d9"),
          border:`2px solid ${thirdUp?"#4080e0":(theme === 'dark' ? "#2a2a2a" : "#999")}`,
          color:thirdUp?"#4080e0":(theme === 'dark' ? "#d9d9d9" : "#222"),
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0,
          boxShadow:thirdUp?"0 0 10px rgba(64,128,224,0.2)":"none", flexShrink:0,
        }}><span style={{fontSize:11}}>↑</span><span>III</span></button>}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:12, width:"100%", maxWidth:380 }}>
        <button onClick={handlePlayPause} style={{
          ...btn, width:72, height:72, borderRadius:"50%", fontSize:24,
          background:playing?"linear-gradient(145deg, #e05020, #c04018)":"linear-gradient(145deg, #222, #1a1a1a)",
          border:`3px solid ${playing?"#e05020":"#444"}`, color:playing?"#000":"#888",
          boxShadow:playing?"0 0 28px rgba(224,80,32,0.4)":"0 4px 10px rgba(0,0,0,0.6)",
          display:"flex", alignItems:"center", justifyContent:"center",
          userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none", flexShrink:0,
        }}>{playing ? <span style={{display:"flex",gap:4}}><span style={{width:5,height:18,background:"#000",borderRadius:1}}/><span style={{width:5,height:18,background:"#000",borderRadius:1}}/></span> : <span style={{marginLeft:3}}>▶</span>}</button>

        <button onClick={handleStop} style={{
          ...btn, width:72, height:72, borderRadius:"50%", fontSize:20,
          background:theme === 'dark' ? "linear-gradient(145deg, #222, #1a1a1a)" : "linear-gradient(145deg, #ddd, #ccc)",
          border:`3px solid ${theme === 'dark' ? "#444" : "#999"}`, color:theme === 'dark' ? "#888" : "#555",
          display:"flex", alignItems:"center", justifyContent:"center",
          userSelect:"none", WebkitUserSelect:"none", flexShrink:0,
        }}>■</button>

        <div style={{flex:1}} />

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
          ...btn, width:44, height:44, borderRadius:10, fontSize:18,
          background:theme==='dark'?'#161616':'#e0e0e0',
          border:`2px solid ${theme==='dark'?'#444':'#ccc'}`,
          color:theme==='dark'?'#ffffff':'#666',
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>{theme === 'dark' ? '☀' : '🌙'}</button>
      </div>

      <div style={{ display:"flex", gap:2, padding:"10px 6px 6px", background:theme === 'dark' ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.06)", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, width:"100%", maxWidth:380, justifyContent:"space-around" }}>
        <VerticalSlider label="Bass" value={bassVol} onChange={setBassVol} muted={anySolo?!bassSolo:bassMute} onMute={()=>setBassMute(v=>!v)} solo={bassSolo} onSolo={()=>setBassSolo(v=>!v)} soloActive={anySolo} rec={bassRec} onRec={()=>{setBassRec(v=>!v);if(!bassRec){setBassMute(false);if(anySolo)setBassSolo(true);}}} isDark={theme === 'dark'} />
        <VerticalSlider label="Kick" value={kickVol} onChange={setKickVol} muted={anySolo?!kickSolo:kickMute} onMute={()=>setKickMute(v=>!v)} solo={kickSolo} onSolo={()=>setKickSolo(v=>!v)} soloActive={anySolo} rec={kickRec} onRec={()=>{setKickRec(v=>!v);if(!kickRec){setKickMute(false);if(anySolo)setKickSolo(true);}}} isDark={theme === 'dark'} />
        <VerticalSlider label="Hats" value={hatVol} onChange={setHatVol} muted={anySolo?!hatSolo:hatMute} onMute={()=>setHatMute(v=>!v)} solo={hatSolo} onSolo={()=>setHatSolo(v=>!v)} soloActive={anySolo} rec={hatRec} onRec={()=>{setHatRec(v=>!v);if(!hatRec){setHatMute(false);if(anySolo)setHatSolo(true);}}} isDark={theme === 'dark'} />
        <VerticalSlider label="Clap" value={clapVol} onChange={setClapVol} muted={anySolo?!clapSolo:clapMute} onMute={()=>setClapMute(v=>!v)} solo={clapSolo} onSolo={()=>setClapSolo(v=>!v)} soloActive={anySolo} rec={clapRec} onRec={()=>{setClapRec(v=>!v);if(!clapRec){setClapMute(false);if(anySolo)setClapSolo(true);}}} color="#cc4422" isDark={theme === 'dark'} />
        <VerticalSlider label="Filt" value={filterCut} onChange={setFilterCut} min={80} max={4000} color="#e08040" muted={filterMute} onMute={()=>setFilterMute(v=>!v)} isDark={theme === 'dark'} log />
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
              const isSeqPending=seqPlay&&seqPendingSlot===idx;
              return(<SlotButton key={idx} idx={idx}
                filled={savedSlots[idx]!==null} isActive={activeSlot===idx||isSeqActive} isPending={isSeqPending}
                slotColor={savedSlots[idx]?.color || rndColor}
                onTap={()=>handleSlotTap(idx)} onLongPress={()=>handleSlotDelete(idx)} btnBase={btn} isDark={theme === 'dark'}
              />);
            })}
          </div>
        ))}
        <div style={{ display:"flex", gap:6, marginTop:8, justifyContent:"center" }}>
          <button onClick={handleExport} style={{ ...btn, flex:1, maxWidth:120, padding:"8px 6px", borderRadius:6, fontSize:8, letterSpacing:1.5, background:theme === 'dark' ? "#161616" : "#dedede", border:`1px solid ${theme === 'dark' ? "#2a2a2a" : "#bbb"}`, color:theme === 'dark' ? "#888" : "#444" }}>
            ↓ EXPORT
          </button>
          <button onClick={()=>importFileRef.current?.click()} style={{ ...btn, flex:1, maxWidth:120, padding:"8px 6px", borderRadius:6, fontSize:8, letterSpacing:1.5, background:theme === 'dark' ? "#161616" : "#dedede", border:`1px solid ${theme === 'dark' ? "#2a2a2a" : "#bbb"}`, color:theme === 'dark' ? "#888" : "#444" }}>
            ↑ IMPORT
          </button>
          <button onClick={()=>{ if(confirm('Clear all 24 slots?')){const empty=Array(24).fill(null);setSavedSlots(empty);persistSlots(empty);setActiveSlot(null);} }} style={{ ...btn, flex:1, maxWidth:120, padding:"8px 6px", borderRadius:6, fontSize:8, letterSpacing:1.5, background:theme === 'dark' ? "#161616" : "#dedede", border:`1px solid ${theme === 'dark' ? "#2a2a2a" : "#bbb"}`, color:theme === 'dark' ? "#c04020" : "#a03018" }}>
            ✕ CLEAR
          </button>
          <input ref={importFileRef} type="file" accept=".json" onChange={handleImport} style={{ display:"none" }} />
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:380 }}>
        <button onClick={()=>setSettingsOpen(v=>!v)} style={{ ...btn, width:"100%", padding:"10px 8px", borderRadius:10, fontSize:8, letterSpacing:2, background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, color:theme === 'dark' ? "#666" : "#555" }}>
          {settingsOpen?"▼":"▶"} SETTINGS
        </button>
        {settingsOpen && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>

            {/* Advanced features */}
            <div style={{ background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center" }}>
                <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
                  <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} style={{ marginRight:4 }} />
                  Advanced features (pitch shift buttons)
                </label>
              </div>
            </div>

            {/* Preset Fade */}
            <div style={{ background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>PRESET FADE</div>
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
                Fade time: {(fadeSteps * stepTime * 1000).toFixed(0)}ms ({fadeSteps} steps)
              </div>
            </div>

            {/* Sequence Play */}
            <div style={{ background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>SEQUENCE PLAY</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
                  <input type="checkbox" checked={seqPlay} onChange={(e) => setSeqPlay(e.target.checked)} style={{ marginRight:4 }} />
                  Play patterns in sequence
                </label>
                <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
                  Bars: <input type="number" min="1" max="64" value={seqBars} onChange={(e) => setSeqBars(parseInt(e.target.value) || 4)} style={{ width:44, background:theme === 'dark' ? "#1a1a1a" : "#fff", border:`1px solid ${theme === 'dark' ? "#333" : "#ccc"}`, color:theme === 'dark' ? "#ccc" : "#000", fontSize:10, padding:2, borderRadius:3 }} />
                </label>
              </div>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center" }}>
                {seqPlay ? `Each pattern plays ${seqBars} bar${seqBars>1?"s":""} • TAP slot to queue next` : "Enable to auto-advance through filled patterns"}
              </div>
            </div>

            {/* Mute Lock */}
            <div style={{ background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>MUTE LOCK</div>
              <div style={{ display:"flex", justifyContent:"center", alignItems:"center", marginBottom:6 }}>
                <label style={{ fontSize:10, color:theme === 'dark' ? "#ccc" : "#000" }}>
                  <input type="checkbox" checked={muteLock} onChange={(e) => setMuteLock(e.target.checked)} style={{ marginRight:4 }} />
                  Lock muted channels on Random
                </label>
              </div>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center" }}>
                {muteLock ? "Muted channels keep current pattern when generating Random" : "All channels randomised regardless of mute state"}
              </div>
            </div>

            {/* Experimental label */}
            <div style={{ fontSize:8, color:theme === 'dark' ? "#555" : "#888", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginTop:2 }}>
              EXPERIMENTAL
            </div>

            {/* MIDI Output */}
            <div style={{ background:theme === 'dark' ? "rgba(255,255,255,0.01)" : "#edeef2", borderRadius:10, border:`1px solid ${theme === 'dark' ? "#1a1a1a" : "#ccc"}`, padding:"10px 8px 8px" }}>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#444" : "#555", letterSpacing:2, textTransform:"uppercase", textAlign:"center", marginBottom:6 }}>MIDI OUTPUT</div>
              <select onChange={(e) => setSelectedMidiOutput(midiOutputs.find(o => o.id === e.target.value) || null)} value={selectedMidiOutput?.id || ''} style={{ width:"100%", background:theme === 'dark' ? "#1a1a1a" : "#fff", border:`1px solid ${theme === 'dark' ? "#333" : "#ccc"}`, color:theme === 'dark' ? "#ccc" : "#000", fontSize:10, padding:4, borderRadius:4 }}>
                <option value=''>No MIDI Output</option>
                {midiOutputs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <div style={{ fontSize:8, color:theme === 'dark' ? "#666" : "#444", textAlign:"center", marginTop:6 }}>
                Channels: Bass Ch{midiChannels.bass}, Kick Ch{midiChannels.kick}, Hats Ch{midiChannels.hats}, Clap Ch{midiChannels.clap}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ADMIN: Metadata editor */}
      {adminMode && draft && (
        <div style={{ width:"100%", maxWidth:380, background:"rgba(208,32,32,0.05)", borderRadius:10, border:"1px solid #d0202033", padding:"10px 8px 8px" }}>
          <button onClick={()=>setAdminMetaOpen(v=>!v)} style={{ ...btn, width:"100%", fontSize:8, letterSpacing:2, color:"#d02020", background:"transparent", border:"none", padding:"2px 0", cursor:"pointer" }}>
            {adminMetaOpen?"▼":"▶"} PACKAGE METADATA
          </button>
          {adminMetaOpen && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:8 }}>
              {[
                { label:"ID", field:"id", val:draft.id },
                { label:"Name", field:"name", val:draft.name },
                { label:"Artist", field:"artist", val:draft.artist },
                { label:"Description", field:"description", val:draft.description },
                { label:"Key", field:"key", val:draft.key },
                { label:"BPM", field:"bpm", val:draft.bpm, type:"number" },
              ].map(({label,field,val,type})=>(
                <label key={field} style={{ display:"flex", alignItems:"center", gap:6, fontSize:9, color:theme==='dark'?"#ccc":"#333" }}>
                  <span style={{ width:70, textAlign:"right", letterSpacing:1, fontSize:8 }}>{label}:</span>
                  <input
                    type={type||"text"} defaultValue={val}
                    onBlur={(e)=>{const v=type==="number"?parseFloat(e.target.value):e.target.value;setDraft(updateDraftMeta(draft,{[field]:v}));}}
                    style={{ flex:1, background:theme==='dark'?"#1a1a1a":"#fff", border:`1px solid ${theme==='dark'?"#333":"#ccc"}`, color:theme==='dark'?"#ccc":"#000", fontSize:9, padding:"3px 6px", borderRadius:4, fontFamily:"'Space Mono',monospace" }}
                  />
                </label>
              ))}
              <div style={{ fontSize:8, color:theme==='dark'?"#666":"#888", textAlign:"center", marginTop:4 }}>
                Set name: <input
                  defaultValue={draft.sets[draft._activeSet||0]?.name||""}
                  onBlur={(e)=>{const d={...draft};d.sets[d._activeSet||0].name=e.target.value;saveDraft(d);setDraft({...d});}}
                  style={{ width:100, background:theme==='dark'?"#1a1a1a":"#fff", border:`1px solid ${theme==='dark'?"#333":"#ccc"}`, color:theme==='dark'?"#ccc":"#000", fontSize:8, padding:"2px 4px", borderRadius:3, fontFamily:"'Space Mono',monospace" }}
                />
              </div>
              <div style={{ display:"flex", gap:6, marginTop:4 }}>
                <span style={{ fontSize:8, color:theme==='dark'?"#888":"#555", letterSpacing:1 }}>Colors:</span>
                {effectiveColors.map((c,i)=>(
                  <input key={i} type="color" value={c} onChange={(e)=>{setDraft(updatePatternColor(draft,draft._activeSet||0,i,e.target.value));}} style={{ width:28, height:20, border:"none", cursor:"pointer", padding:0, background:"transparent" }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize:8, color:theme === 'dark' ? "#333" : "#aaa", textAlign:"center", paddingBottom:8 }}>
        v{__APP_VERSION__}
      </div>
    </div>
  );
}
