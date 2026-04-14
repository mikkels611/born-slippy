import { useRef } from "react";

export default function SlotButton({ idx, filled, isActive, isPending, slotColor, onTap, onLongPress, btnBase, isDark=true }) {
  const timerRef = useRef(null);
  const c = slotColor || "#8020e0";
  const handleDown = () => { if(filled) timerRef.current = setTimeout(()=>{onLongPress();timerRef.current="deleted";}, 600); };
  const handleUp = () => { if(timerRef.current==="deleted"){timerRef.current=null;return;} if(timerRef.current)clearTimeout(timerRef.current); timerRef.current=null; onTap(); };
  const handleCancel = () => { if(timerRef.current&&timerRef.current!="deleted")clearTimeout(timerRef.current); };
  const bg = isActive ? c : filled ? `${c}38` : (isDark ? "#111" : "#f3f3f3");
  const border = isPending ? `2px dashed ${c}` : `2px solid ${isActive ? c : filled ? c : (isDark ? "#222" : "#bbb")}`;
  const textColor = isActive ? "#fff" : filled ? c : (isDark ? "#ddd" : "#333");
  return (
    <button onMouseDown={handleDown} onMouseUp={handleUp} onMouseLeave={handleCancel}
      onTouchStart={(e)=>{e.preventDefault();handleDown();}} onTouchEnd={(e)=>{e.preventDefault();handleUp();}}
      style={{ ...btnBase, width:48, height:40, borderRadius:6, fontSize:11, padding:0,
        background: bg,
        border: border,
        color: textColor,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: isActive ? `0 0 10px ${c}88` : isPending ? `0 0 8px ${c}66` : filled ? `0 0 6px ${c}44` : "none",
        userSelect:"none", WebkitUserSelect:"none", WebkitTouchCallout:"none",
      }}
    >
      {filled ? idx+1 : <span style={{ fontSize:8, opacity:0.5 }}>{idx+1}</span>}
    </button>
  );
}
