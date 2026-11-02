const MorelMotion = (() => {
// Pure time-based trajectories. Every envelope has zero first/second derivatives
// at its boundaries, so overlapping gather, travel and spread never create stops.
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t=clamp(x); return t*t*t*(t*(t*6-15)+10); };
const mix = (a,b,t) => a+(b-a)*t;
const keys=['x','y','w','r'];
function trajectory(from,to,{entrance=false,direct=false,duration=1500,velocity=[],anchorIndex=3,destinationIndex=4}={}) {
 const a=from[anchorIndex], b=to[destinationIndex];
 return progress => {
  const t=clamp(progress);
  return from.map((p,i)=>{
   const q=to[i], rank=q.z-1;
   let result;
   if(direct){result=Object.fromEntries(keys.map(k=>[k,mix(p[k],q[k],smooth(t))]));}
   else if(entrance){
    const opening=smooth((t-.24-rank*.016)/(.76-rank*.016));
    const rise=smooth(t/.84);
    result={x:mix(p.x,q.x,opening),y:mix(p.y,b.y,rise)+(q.y-b.y)*opening,w:mix(p.w,q.w,smooth(t)),r:mix(p.r,q.r,opening)};
   }else{
    const gather=1-smooth(t/(.39+rank*.009));
    const spread=smooth((t-.40-rank*.014)/(.60-rank*.014));
    const travel=smooth(t/.90);
    result={x:mix(a.x,b.x,travel)+(p.x-a.x)*gather+(q.x-b.x)*spread,
     y:mix(a.y,b.y,travel)+(p.y-a.y)*gather+(q.y-b.y)*spread,
     w:mix(p.w,q.w,smooth(t)),r:p.r*gather+q.r*spread};
   }
   // Preserve the instantaneous velocity when scrolling reverses the journey.
   const carry=duration*t*Math.pow(1-clamp(t/.28),3);
   for(const k of keys)result[k]+=(velocity[i]?.[k]||0)*carry;
   result.z=t<.43?p.z:q.z;
   return result;
  });
 };
}
function damp(current,target,dt,tau=145){return mix(current,target,1-Math.exp(-Math.max(0,dt)/tau));}

return {clamp,smooth,mix,trajectory,damp};
})();
