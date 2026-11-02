const {clamp,smooth,mix,trajectory,damp}=MorelMotion;
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches;
const ease='cubic-bezier(.22,.61,.3,1)';
// One reveal vocabulary. Word wrappers preserve the existing text, line breaks and colour.
const revealElements=[...document.querySelectorAll('main h1, main h2, .hero-bottom>p, .description, .partners>p')];
for(const el of revealElements){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){const fragment=document.createDocumentFragment();for(const part of node.textContent.split(/(\s+)/)){if(!part)continue;if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));continue}const mask=document.createElement('span'),word=document.createElement('span');mask.className='word-mask';word.className='reveal-word';word.textContent=part;mask.append(word);fragment.append(mask)}node.replaceWith(fragment)}
}
const smallElements=[...document.querySelectorAll('main .eyebrow,.actions>a')];
smallElements.forEach(e=>e.classList.add('reveal-small'));
const revealed=new WeakSet();
function reveal(el,delay=0){
 if(!el||revealed.has(el))return 0;revealed.add(el);
 const words=[...el.querySelectorAll('.reveal-word')];
 if(reduced){el.classList.add('revealed');return 0}
 if(!words.length){el.animate([
  {transform:'translate3d(0,21px,0)',filter:'blur(9px)',opacity:0,clipPath:'inset(95% 0 0 0)'},
  {transform:'translate3d(0,0,0)',filter:'blur(0)',opacity:1,clipPath:'inset(0% 0 0 0)'}
 ],{duration:760,delay,easing:ease,fill:'both'});return 760}
 const paragraph=el.matches('p'),duration=paragraph?640:820,step=paragraph?36:62;
 let lastTop=null,lineStart=delay,index=0,end=delay;
 // Lines overlap their settling tails; reading order remains strictly increasing.
 words.forEach(word=>{const top=word.parentElement.getBoundingClientRect().top;
  if(lastTop!==null&&Math.abs(top-lastTop)>5){lineStart=paragraph?end-duration*.36:lineStart+index*step;index=0}lastTop=top;
  const start=lineStart+index++*step;end=start+duration;
  word.animate([
   {transform:'translate3d(0,105%,0)',filter:'blur(11px)',opacity:.1},
   {transform:'translate3d(0,0%,0)',filter:'blur(0px)',opacity:1}
  ],{duration,delay:start,easing:ease,fill:'both'});
 });return end-delay;
}
function revealSection(section){
 const label=section.querySelector('.eyebrow'),heading=section.querySelector('h2'),paragraph=section.querySelector('.description')||section.querySelector(':scope>p:not(.eyebrow)');
 reveal(label);const headingTime=reveal(heading,130),paragraphStart=Math.min(headingTime*.55,640);
 const paragraphTime=reveal(paragraph,paragraphStart);
 section.querySelectorAll('.actions>a').forEach((el,i)=>reveal(el,paragraphStart+Math.max(0,paragraphTime-300)+i*90));
}
const cards=document.querySelector('#cards'),heroSlot=document.querySelector('.hero-composition'),collage=document.querySelector('#collage'),studio=document.querySelector('.studio');
// The same seven DOM images live in one document-space layer throughout the journey.
const layer=document.createElement('div');layer.className='physical-card-layer';document.body.append(layer);layer.append(cards);cards.className='physical-cards';
const alts=['Maison contemporaine et piscine face au paysage','Salon lumineux ouvert sur la mer','Maison de plain-pied au milieu des pins','Cuisine de pierre et de bois','Maison de pierre et jardin méditerranéen','Escalier sculptural et lumière naturelle','Appartement parisien aux matières chaleureuses'];
for(let i=0;i<7;i++){const img=document.createElement('img');img.className='physical-card';img.src=`public/atelier-morel/project-0${i+1}.png`;img.alt=alts[i];img.width=1254;img.height=1254;img.draggable=false;cards.append(img)}
const photos=[...cards.children];
let mode='hero',desired='hero',targetScene='hero',cardFrame=0;
let current=[],velocity=[],lastCardTime=0;
function box(el){const r=el.getBoundingClientRect();return{x:r.left,y:r.top+scrollY,w:r.width,h:r.height}}
function poses(scene){const w=innerWidth,mobile=w<=600,b=box(scene==='hero'?heroSlot:studio),size=scene==='hero'?w*(mobile?.235:.145):w*(mobile?.34:.196);
 const hero=[[.16,34,-12],[.255,-9,-8],[.348,7,-4],[.435,5,0],[.515,3,3],[.605,13,7],[.695,10,10]];
 const diagonal=mobile?[[.07,.58,-2],[.30,.64,1],[.53,.70,-4],[.76,.76,2],[.96,.82,-1],[1.16,.87,5],[1.35,.92,7]]:[[.37,.46,-2],[.50,.53,1],[.63,.60,-4],[.76,.67,2],[.89,.74,-1],[1.03,.81,5],[1.16,.88,7]];
 const order=[4,3,0,1,2,5,6];return photos.map((_,i)=>{const j=scene==='hero'?i:order.indexOf(i),p=scene==='hero'?hero[j]:diagonal[j];return{x:scene==='hero'?(mobile?(p[0]-.10)*w*1.27:p[0]*w):p[0]*w,y:b.y+(scene==='hero'?p[1]*(mobile?.6:1):p[1]*b.h),w:size,r:p[2],z:j+1}})
}
function pack(anchor,size){return photos.map((_,i)=>({x:anchor.x+(i-3)*.65,y:anchor.y+(i-3)*.45,w:size,r:(i-3)*.32,z:i+1}))}
// A fixed raster box is scaled on the compositor; no width/layout animation.
const rasterSize=256;
photos.forEach(el=>{el.style.width=`${rasterSize}px`;el.style.height=`${rasterSize}px`;el.style.transformOrigin='0 0'});
function paint(p){current=p;photos.forEach((el,i)=>{
 const q=p[i],scale=q.w/rasterSize;
 el.style.transform=`translate3d(${q.x+q.w/2}px,${q.y+q.w/2}px,0) rotate(${q.r}deg) scale(${scale}) translate(-50%,-50%)`;
 el.style.borderRadius=`${(innerWidth<=600?10:12)/scale}px`;
 el.style.zIndex=q.z;el.style.visibility='visible';
})}
const badgeBases=new WeakMap();
function badges(scene,show){document.querySelectorAll(scene==='hero'?'.hero-badge':'.collage-badge').forEach((el,i)=>{
 if(!badgeBases.has(el))badgeBases.set(el,getComputedStyle(el).transform);
 const base=badgeBases.get(el),opacity=getComputedStyle(el).opacity;
 el.getAnimations().forEach(a=>a.cancel());el.style.opacity=show?'1':'0';
 if(!reduced)el.animate(show?[
  {transform:`${base} scale(.83) translateY(7px)`,opacity:0},
  {transform:`${base} scale(1) translateY(0)`,opacity:1}
 ]:[{opacity},{opacity:0}],{duration:show?390:230,delay:show?i*55:0,easing:ease,fill:'both'});
})}
function arrows(){document.querySelectorAll('.section-arrows,.hero-down').forEach(el=>reveal(el,100))}
function revealHeroBottom(){reveal(document.querySelector('.hero-bottom>p'));document.querySelectorAll('.hero .actions>a').forEach((el,i)=>reveal(el,560+i*90))}
function runCards(next,{entrance=false,direct=false}={}){
 cancelAnimationFrame(cardFrame);targetScene=next;
 const destination=poses(next),duration=direct?650:entrance?1420:1580;
 if(!current.length)paint(pack({...destination[3],y:destination[3].y+100},destination[3].w));
 const path=trajectory(current,destination,{entrance,direct,duration,velocity,anchorIndex:mode==='hero'?3:4,destinationIndex:next==='hero'?3:4});
 const started=performance.now();lastCardTime=started;
 let popped=false,contentStarted=false;
 badges('hero',false);badges('collage',false);
 if(reduced){paint(destination);mode=next;cards.dataset.phase=next;badges(next,true);arrows();revealHeroBottom();if(next==='collage')revealSection(studio);return}
 function tick(now){
  const t=clamp((now-started)/duration),p=path(t),dt=Math.max(1,now-lastCardTime);
  velocity=p.map((q,i)=>Object.fromEntries(['x','y','w','r'].map(k=>[k,(q[k]-current[i][k])/dt])));
  paint(p);lastCardTime=now;
  cards.dataset.phase=entrance?(t<.24?'rise':'fan'):(t<.35?'gather-travel':t<.55?'travel-spread':'spread');
  if(!contentStarted&&t>.42){contentStarted=true;if(next==='collage')revealSection(studio);else revealHeroBottom()}
  if(!popped&&t>.86){popped=true;badges(next,true);arrows()}
  if(t<1)cardFrame=requestAnimationFrame(tick);
  else{cardFrame=0;velocity=[];mode=next;cards.dataset.phase=next;paint(destination)}
 }
 cardFrame=requestAnimationFrame(tick);
}
function checkScene(){const r=studio.getBoundingClientRect();
 if(r.top<innerHeight*.70)desired='collage';else if(r.top>innerHeight*.95)desired='hero';
 if(desired!==targetScene)runCards(desired);
}
const down=document.createElement('a');down.className='hero-down';down.href='#studio';down.setAttribute('aria-label','Découvrir le studio');down.textContent='↓';document.querySelector('.hero-bottom').append(down);
const feature=document.querySelector('.feature-image'),featureMotion=document.createElement('div');featureMotion.className='feature-motion';feature.before(featureMotion);featureMotion.append(feature);featureMotion.append(document.querySelector('.featured-title>.badge'));
// The image entrance and parallax share a stable outer wrapper. Its children,
// including the existing badge and controls, inherit both movements together.
featureMotion.classList.add('feature-pending');
featureMotion.style.transform='translate3d(0,64px,0)';
let featureEntered=false,featureStart=null,featureFrame=0,parallax=0,parallaxTarget=0,lastFeatureTime=0,featureOffset=64;
const featureUI=[...feature.querySelectorAll('.view-switch,.discover,.image-controls'),featureMotion.querySelector('.badge')];
featureUI.forEach(el=>el.classList.add('feature-ui-pending'));
function updateParallaxTarget(){const r=featureMotion.getBoundingClientRect();
 const untransformedTop=r.top-featureOffset;
 parallaxTarget=clamp((innerHeight*.55-untransformedTop-r.height*.5)*.035/30+.5)*30-15;
}
function featureTick(now){
 featureFrame=0;const dt=lastFeatureTime?Math.min(50,now-lastFeatureTime):16.67;lastFeatureTime=now;
 parallax=damp(parallax,parallaxTarget,dt,155);
 const progress=featureStart===null?0:clamp((now-featureStart)/1250);
 const arrival=1-Math.pow(1-progress,4);
 featureOffset=64*(1-arrival)+parallax;
 featureMotion.style.transform=`translate3d(0,${featureOffset}px,0)`;
 featureMotion.style.opacity=String(featureEntered?Math.min(1,progress*3.5):0);
 if(featureEntered&&(progress<1||Math.abs(parallax-parallaxTarget)>.025))featureFrame=requestAnimationFrame(featureTick);
}
function enterFeature(){if(featureEntered)return;featureEntered=true;featureMotion.classList.remove('feature-pending');
 if(reduced){featureOffset=0;featureMotion.style.transform='none';featureMotion.style.opacity='1';featureUI.forEach(el=>el.classList.remove('feature-ui-pending'));return}
 featureStart=performance.now();updateParallaxTarget();
 featureUI.forEach((el,i)=>{const base=getComputedStyle(el).transform;el.classList.remove('feature-ui-pending');el.animate([
  {transform:`${base==='none'?'':base} translateY(13px)`,opacity:0,filter:'blur(4px)'},
  {transform:`${base==='none'?'':base} translateY(0)`,opacity:1,filter:'blur(0)'}
 ],{duration:700,delay:300+i*65,easing:ease,fill:'both'})});
 if(!featureFrame)featureFrame=requestAnimationFrame(featureTick);
}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){revealSection(e.target);observer.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.featured,.partners').forEach(e=>observer.observe(e));
const featureObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){enterFeature();featureObserver.disconnect()}}),{threshold:.08});featureObserver.observe(featureMotion);
let frame=0;function onScroll(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;checkScene();if(!reduced){updateParallaxTarget();if(featureEntered&&!featureFrame){lastFeatureTime=0;featureFrame=requestAnimationFrame(featureTick)}}})}addEventListener('scroll',onScroll,{passive:true});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{checkScene();runCards(desired,{direct:true});updateParallaxTarget();if(featureEntered&&!reduced&&!featureFrame)featureFrame=requestAnimationFrame(featureTick)},120)});
motionPreference.addEventListener('change',()=>{reduced=motionPreference.matches;if(reduced){
 cancelAnimationFrame(cardFrame);cancelAnimationFrame(featureFrame);cardFrame=featureFrame=0;
 document.getAnimations().forEach(a=>{if(a.effect.getTiming().iterations!==Infinity)a.finish()});
 paint(poses(desired));mode=targetScene=desired;velocity=[];cards.dataset.phase=desired;
 document.querySelectorAll('.reveal-word,.reveal-small').forEach(e=>e.classList.add('revealed'));
 badges('hero',false);badges('collage',false);badges(mode,true);featureOffset=parallax=0;
 featureMotion.style.transform='none';featureMotion.style.opacity='1';featureMotion.classList.remove('feature-pending');featureUI.forEach(el=>el.classList.remove('feature-ui-pending'));
}else{updateParallaxTarget();if(featureEntered){featureStart=performance.now()-1250;featureFrame=requestAnimationFrame(featureTick)}}});
if(reduced){runCards('hero');revealElements.forEach(e=>reveal(e));smallElements.forEach(e=>reveal(e));checkScene()}else{
 document.querySelector('header').animate([{filter:'blur(11px)',transform:'translate3d(0,-12px,0)',opacity:0},{filter:'blur(0)',transform:'translate3d(0,0,0)',opacity:1}],{duration:950,easing:ease});
 reveal(document.querySelector('h1'),120);runCards('hero',{entrance:true});checkScene();
}
const marks=['PIERRE & FILS','MAISON VARENNE','LIGNE','ATELIER SAINT-CLAIR','MATIÈRE','DELORME','NORD','FORMA'];const track=document.querySelector('.marquee-track');for(let j=0;j<2;j++){const group=document.createElement('div');group.className='wordmarks';group.setAttribute('aria-hidden','true');marks.forEach((name,i)=>{const s=document.createElement('span');s.className=`wordmark w${i}`;s.textContent=name;group.append(s)});track.append(group)}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{const detail=b.dataset.view==='detail';document.querySelector('.feature-image').classList.toggle('detail',detail);document.querySelectorAll('.view-switch button').forEach(x=>{x.classList.toggle('active',x.dataset.view===b.dataset.view);x.setAttribute('aria-pressed',x.dataset.view===b.dataset.view)})}));
document.querySelector('.discover').onclick=()=>document.querySelector('#project-dialog').showModal();document.querySelectorAll('.contact-open').forEach(b=>b.onclick=()=>document.querySelector('#contact-dialog').showModal());document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});document.querySelector('.close-contact').onclick=()=>document.querySelector('#contact-dialog').close();document.querySelector('#approach-link').onclick=e=>{e.preventDefault();const p=document.querySelector('.approach-note');p.hidden=!p.hidden};
