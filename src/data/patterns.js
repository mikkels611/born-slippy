const NOTE_FREQS = {
  E1: 41.20, F1: 43.65, G1: 49.00, A1: 55.00, B1: 61.74,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, Fs2: 92.50,
  G2: 98.00, A2: 110.0, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81,
};

const DEFAULT_SCALE_POOLS = [
  [NOTE_FREQS.E2, NOTE_FREQS.G2, NOTE_FREQS.A2, NOTE_FREQS.B2, NOTE_FREQS.D2],
  [NOTE_FREQS.E2, NOTE_FREQS.Fs2, NOTE_FREQS.G2, NOTE_FREQS.A2, NOTE_FREQS.B2, NOTE_FREQS.C3, NOTE_FREQS.D3],
  [NOTE_FREQS.E2, NOTE_FREQS.G2, NOTE_FREQS.B2, NOTE_FREQS.E3],
  [NOTE_FREQS.E2, NOTE_FREQS.B2, NOTE_FREQS.E3, NOTE_FREQS.A2],
  [NOTE_FREQS.E2, NOTE_FREQS.F2, NOTE_FREQS.G2, NOTE_FREQS.Bb2, NOTE_FREQS.D2],
];

export const KICK_TEMPLATES = [
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[1,0,0,0.2,1,0,0,0,1,0,0,0.2,1,0,0,0],
  [1,0,0,0,1,0,0.3,0,1,0,0,0,1,0,0.3,0],[1,0,0,0,1,0,0,0,0,0,0.4,0,1,0,0,0],
  [1,0.5,0,0,1,0,0,0,1,0.5,0,0,1,0,0,0],[1,0,0,0,0,0,0,0,1,0,0,0.3,0,0,0.4,0],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0],[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0.3],
];

export const HAT_TEMPLATES = {
  open: [[0,0,0.6,0,0,0,0.7,0,0,0,0.6,0,0,0,0.7,0],[0,0,0,0,0,0,0.6,0,0,0,0,0,0,0,0.7,0],[0,0,0.5,0,0,0,0,0.5,0,0,0.6,0,0,0,0,0.5],[0,0,0,0,0,0,0.5,0,0,0,0,0,0,0,0.5,0.3]],
  closed: [[0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15,0.3,0.15,0.2,0.15],[0.4,0,0.3,0,0.4,0,0.3,0,0.4,0,0.3,0,0.4,0,0.3,0],[0.3,0.2,0.15,0.25,0.3,0.15,0.2,0.3,0.3,0.2,0.15,0.25,0.3,0.15,0.25,0.2],[0.25,0,0,0,0.25,0,0,0,0.25,0,0,0,0.25,0,0,0],[0.3,0,0.2,0.15,0,0.2,0,0.15,0.3,0,0.2,0.15,0,0.2,0,0.15]],
};

export const CLAP_TEMPLATES = [[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0.2,0,0,0,0,1,0,0,0.3],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0],[0,0,0,0,1,0,0,0,0,0,0,0.3,0,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0.2]];

function generateBassLine(scalePools) {
  const pools = scalePools || DEFAULT_SCALE_POOLS;
  const pool = pools[Math.floor(Math.random() * pools.length)];
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

export function generateRandomPattern(themePackage) {
  const { bass, accent } = generateBassLine(themePackage?.scalePools);
  const kick=[...KICK_TEMPLATES[Math.floor(Math.random()*KICK_TEMPLATES.length)]];
  const ohat=[...HAT_TEMPLATES.open[Math.floor(Math.random()*HAT_TEMPLATES.open.length)]];
  const chat=[...HAT_TEMPLATES.closed[Math.floor(Math.random()*HAT_TEMPLATES.closed.length)]];
  const clap=[...CLAP_TEMPLATES[Math.floor(Math.random()*CLAP_TEMPLATES.length)]];
  for(let i=0;i<16;i++){if(kick[i]>0&&kick[i]<1)kick[i]*=0.8+Math.random()*0.4;if(ohat[i]>0)ohat[i]*=0.85+Math.random()*0.3;if(chat[i]>0)chat[i]*=0.85+Math.random()*0.3;}
  return { name:"RND", bass, accent, kick, ohat, chat, clap };
}

// FIXED_PATTERNS removed — patterns now live inside Theme Packages
// (see src/data/themePackages.js)
