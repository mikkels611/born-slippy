import { Link } from 'react-router-dom';

export default function CataloguePage() {
  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'Space Mono', monospace", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 10px 24px", gap:16 }}>
      <div style={{ textAlign:"center" }}>
        <h1 style={{ fontSize:14, letterSpacing:7, color:"#e05020", margin:0, fontWeight:700 }}>BORN SLIPPY</h1>
        <div style={{ fontSize:10, color:"#555", letterSpacing:3, marginTop:3 }}>SESSION CATALOGUE</div>
      </div>

      <Link to="/" style={{ fontSize:10, color:"#e05020", letterSpacing:2, textDecoration:"none", fontFamily:"'Space Mono', monospace" }}>
        ← BACK TO SEQUENCER
      </Link>

      <div style={{ width:"100%", maxWidth:500, background:"rgba(255,255,255,0.01)", borderRadius:10, border:"1px solid #1a1a1a", padding:"24px 16px", textAlign:"center" }}>
        <div style={{ fontSize:11, color:"#666", letterSpacing:1 }}>
          CATALOGUE COMING SOON
        </div>
        <div style={{ fontSize:9, color:"#444", marginTop:8, lineHeight:"1.6" }}>
          Browse and share sessions with the community.<br />
          Star your favourites. Upload your own creations.
        </div>
      </div>
    </div>
  );
}
