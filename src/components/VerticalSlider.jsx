import { useRef, useCallback } from "react";

export default function VerticalSlider({ label, value, onChange, min=0, max=1, color="#e05020", muted, onMute, solo, onSolo, soloActive, rec, onRec, isDark=true }) {
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
  const muteBlocked = soloActive && !solo;
  const muteBtnBg = muted ? "#e05020" : (isDark ? "#1a1a1a" : "#d9d9d9");
  const muteBtnBorder = muted ? "#e05020" : (isDark ? "#333" : "#b4b4b4");
  const muteBtnColor = muted ? "#0d0d0d" : (isDark ? "#d9d9d9" : "#2a2a2a");
  const soloBtnBg = solo ? "#e0a020" : (isDark ? "#1a1a1a" : "#d9d9d9");
  const soloBtnBorder = solo ? "#e0a020" : (isDark ? "#333" : "#b4b4b4");
  const soloBtnColor = solo ? "#0d0d0d" : (isDark ? "#d9d9d9" : "#2a2a2a");
  const recBtnBg = rec ? "#d02020" : (isDark ? "#1a1a1a" : "#d9d9d9");
  const recBtnBorder = rec ? "#d02020" : (isDark ? "#333" : "#b4b4b4");
  const recBtnColor = rec ? "#fff" : (isDark ? "#d9d9d9" : "#2a2a2a");
  const labelColor = muted ? "#666" : (isDark ? "#ccc" : "#555");
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1, minWidth:0 }}>
      {onRec && <button onClick={onRec} style={{ width:32, height:20, borderRadius:3, background:recBtnBg, border:`1px solid ${recBtnBorder}`, color:recBtnColor, fontSize:7, fontWeight:700, letterSpacing:0.5, fontFamily:"'Space Mono', monospace", cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.1s", padding:0 }}>R</button>}
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
      {onMute && <button onClick={muteBlocked?undefined:onMute} style={{ width:32, height:20, borderRadius:3, background:muteBtnBg, border:`1px solid ${muteBtnBorder}`, color:muteBtnColor, fontSize:7, fontWeight:700, letterSpacing:0.5, fontFamily:"'Space Mono', monospace", cursor:muteBlocked?"default":"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.1s", padding:0, opacity:muteBlocked?0.25:1 }}>{muted?"OFF":"M"}</button>}
      {onSolo && <button onClick={onSolo} style={{ width:32, height:20, borderRadius:3, background:soloBtnBg, border:`1px solid ${soloBtnBorder}`, color:soloBtnColor, fontSize:7, fontWeight:700, letterSpacing:0.5, fontFamily:"'Space Mono', monospace", cursor:"pointer", WebkitTapHighlightColor:"transparent", transition:"all 0.1s", padding:0 }}>S</button>}
    </div>
  );
}
