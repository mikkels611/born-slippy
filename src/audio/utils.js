export function createDistortionCurve(amount) {
  const s=44100,c=new Float32Array(s);for(let i=0;i<s;i++){const x=(i*2)/s-1;c[i]=((3+amount)*x*20*(Math.PI/180))/(Math.PI+amount*Math.abs(x));}return c;
}
