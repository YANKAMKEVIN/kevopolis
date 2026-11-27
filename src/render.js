// @ts-check
/** Rendu canvas en 3D isométrique : ciel selon l'heure, île, bâtiments, lumières, textes flottants. */
import { N, clamp, rng, score } from './rules.js';
import { etat } from './state.js';
import { art } from './art.js';

// ---------- canvas ----------
/** @type {HTMLCanvasElement} */
export const cv=/** @type {any} */ (document.getElementById('c'));
let ctx=/** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
export function resize(){
  etat.DPR=Math.min(window.devicePixelRatio||1,2);etat.W=innerWidth;etat.H=innerHeight;
  cv.width=etat.W*etat.DPR;cv.height=etat.H*etat.DPR;
  fit();
}
export function fit(){
  if(!etat.G||!etat.W)return;
  // téléphone couché : les vœux et l'horloge sont sur les côtés, l'île peut monter tout en haut
  const land=etat.W>etat.H*1.3&&etat.H<560;
  const top=land?18:etat.W<700?168:100, bot=etat.W<700?236:land?150:176;
  const availH=Math.max(120,etat.H-top-bot), availW=land?etat.W*.46:etat.W*.94;
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  etat.G.cells.forEach((c,i)=>{if(!c.land)return;const x=i%N,y=(i/N)|0,sx=(x-y)*.5,sy=(x+y)*.25+.25;x0=Math.min(x0,sx-.5);x1=Math.max(x1,sx+.5);y0=Math.min(y0,sy-.9);y1=Math.max(y1,sy+.6)});
  etat.TW=Math.min(availW/(x1-x0),availH/(y1-y0),140);etat.TH=etat.TW/2;
  etat.OX=etat.W/2-etat.TW*(x0+x1)/2;etat.OY=top+(availH-etat.TW*(y1-y0))/2-etat.TW*y0;
}
addEventListener('resize',resize);
function cellXY(i){const x=i%N,y=(i/N)|0;return[etat.OX+(x-y)*etat.TW/2,etat.OY+(x+y)*etat.TH/2+etat.TH/2]}
export function pick(mx,my){
  const u=(mx-etat.OX)/(etat.TW/2),v=(my-etat.OY)/(etat.TH/2);
  const x=Math.floor((u+v)/2),y=Math.floor((v-u)/2);
  if(x<0||y<0||x>=N||y>=N)return -1;return y*N+x;
}
// couleurs
function hex(c){c=c.replace('#','');return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]}
function mix(a,b,t){const A=hex(a),B=hex(b);return'#'+A.map((v,k)=>Math.round(v+(B[k]-v)*t).toString(16).padStart(2,'0')).join('')}
function shade(c,k){return k<0?mix(c,'#1d2240',-k):mix(c,'#ffffff',k)}
/** [heure, haut du ciel, bas du ciel, lumière ambiante] @type {[number,string,string,string][]} */
const SKY=/** @type {any} */ ([
 [6, '#f6c1a6','#8fb7c8','#ffd6c4'],
 [8.5,'#aedfe0','#5fb0be','#fff6ec'],
 [13,'#94d6df','#4aa4b8','#ffffff'],
 [16.5,'#f3cf96','#6aa2b8','#ffe8c8'],
 [19, '#e8907e','#4d5e90','#e9b2a8'],
 [21, '#2d3768','#1a2246','#7a83bb'],
 [24, '#131938','#0a0f28','#5d64a6']]);
function sky(h){
  for(let k=0;k<SKY.length-1;k++){const a=SKY[k],b=SKY[k+1];if(h<=b[0]){const t=clamp((h-a[0])/(b[0]-a[0]),0,1);return[1,2,3].map(n=>mix(a[n],b[n],t))}}
  const l=SKY[SKY.length-1];return[l[1],l[2],l[3]];
}
// géométrie iso
function poly(pts,fill){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
function prism(x,y,hw,hh,h,col){
  poly([[x-hw,y],[x,y+hh],[x,y+hh-h],[x-hw,y-h]],shade(col,-.1));
  poly([[x,y+hh],[x+hw,y],[x+hw,y-h],[x,y+hh-h]],shade(col,-.26));
  poly([[x,y-hh-h],[x+hw,y-h],[x,y+hh-h],[x-hw,y-h]],shade(col,.12));
}
// quad sur une face : side 'L' ou 'R', a = position le long de la base (0..1), b = hauteur (0..1)
function fq(x,y,hw,hh,h,side,a0,a1,b0,b1){
  const P=(a,b)=>side==='L'?[x-hw+a*hw,y+a*hh-b*h]:[x+a*hw,y+hh-a*hh-b*h];
  return[P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1)];
}
function roof(x,y,hw,hh,h,rh,col){
  const ap=[x,y-h-rh];
  poly([[x-hw,y-h],[x,y+hh-h],ap],shade(col,-.02));
  poly([[x,y+hh-h],[x+hw,y-h],ap],shade(col,-.22));
}
function shadow(x,y,hw,hh,len){
  ctx.fillStyle='rgba(30,25,60,.16)';
  ctx.beginPath();ctx.moveTo(x,y+hh);ctx.lineTo(x+hw,y);ctx.lineTo(x+hw+len,y-len*.15);ctx.lineTo(x+len*.6,y+hh+len*.1);ctx.closePath();ctx.fill();
}
function win(q,lit,night){
  poly(q,'#3d4a63');
  if(lit)etat.LIGHTS.push({q,a:night});
}
function tree(x,y,r,col){
  ctx.fillStyle='#6b5040';ctx.fillRect(x-r*.12,y-r*.9,r*.24,r*.9);
  ctx.fillStyle='rgba(30,25,60,.18)';ctx.beginPath();ctx.ellipse(x+r*.5,y,r*.9,r*.35,0,0,6.3);ctx.fill();
  const gr=ctx.createRadialGradient(x-r*.35,y-r*1.6,r*.1,x,y-r*1.3,r*1.1);gr.addColorStop(0,shade(col,.25));gr.addColorStop(1,shade(col,-.2));
  ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y-r*1.3,r,0,6.3);ctx.fill();
}
function pine(x,y,r){
  ctx.fillStyle='rgba(30,25,60,.18)';ctx.beginPath();ctx.ellipse(x+r*.5,y,r*.8,r*.3,0,0,6.3);ctx.fill();
  poly([[x-r*.8,y-r*.2],[x,y-r*2.6],[x,y]],'#4c7a5c');poly([[x,y],[x,y-r*2.6],[x+r*.8,y-r*.2]],'#365d48');
}
// dessin d'un bâtiment, centre du dessus de la case (x,y), demi-largeur s
function building(type,x,y,s,g,happy,night,t,seed){
  if(type==='maison'){
    const hw=s*.48,hh=hw/2,h=s*.42*g;
    shadow(x,y,hw,hh,s*.35*g);
    prism(x,y,hw,hh,h,'#f4eee2');
    if(g>.6){win(fq(x,y,hw,hh,h,'L',.22,.42,.35,.7),happy,night);win(fq(x,y,hw,hh,h,'L',.6,.8,.35,.7),happy,night);win(fq(x,y,hw,hh,h,'R',.4,.62,.0,.62),happy&&seed%2,night)}
    roof(x,y,hw,hh,h,s*.42*g,'#e2725b');
  }else if(type==='boutique'){
    const hw=s*.56,hh=hw/2,h=s*.36*g;
    shadow(x,y,hw,hh,s*.3*g);
    prism(x,y,hw,hh,h,'#f2c14e');
    if(g>.6){
      win(fq(x,y,hw,hh,h,'L',.15,.85,.12,.55),happy,night);win(fq(x,y,hw,hh,h,'R',.15,.85,.12,.55),happy,night);
      for(let k=0;k<6;k++){poly(fq(x,y,hw,hh,h,'L',k/6,(k+1)/6,.62,.84),k%2?'#fffaf0':'#e2725b');poly(fq(x,y,hw,hh,h,'R',k/6,(k+1)/6,.62,.84),k%2?shade('#fffaf0',-.15):shade('#e2725b',-.15))}
    }
  }else if(type==='atelier'){
    const hw=s*.6,hh=hw/2,h=s*.5*g;
    shadow(x,y,hw,hh,s*.45*g);
    prism(x,y,hw,hh,h,'#6f7f92');
    if(g>.6){
      for(let k=0;k<3;k++){win(fq(x,y,hw,hh,h,'L',.1+k*.28,.3+k*.28,.45,.75),happy,night);win(fq(x,y,hw,hh,h,'R',.1+k*.28,.3+k*.28,.45,.75),happy&&k!==1,night)}
      // cheminée
      const cx=x+hw*.35,cy=y-h-hh*.25;prism(cx,cy,s*.09,s*.045,s*.42*g,'#c9604c');
    }
  }else if(type==='phare'){
    const hw=s*.2,hh=hw/2,h=s*1.25*g;
    shadow(x,y,hw,hh,s*.9*g);
    prism(x,y,hw,hh,h,'#f7f3ea');
    for(let k=0;k<3;k++){const b0=.12+k*.28;poly(fq(x,y,hw,hh,h,'L',0,1,b0,b0+.14),shade('#e2725b',-.05));poly(fq(x,y,hw,hh,h,'R',0,1,b0,b0+.14),shade('#e2725b',-.22))}
    const ly=y-h;prism(x,ly,hw*.85,hh*.85,s*.2*g,night>.2?'#ffe08a':'#cfe7ee');
    roof(x,ly,hw*1.05,hh*1.05,s*.2*g,s*.18*g,'#2f3a55');
    if(night>.05&&g>.9){etat.LIGHTS.push({beam:[x,ly-s*.1],a:night,t})}
  }else if(type==='place'){
    // pavés
    const hw=s*.82,hh=hw/2;
    poly([[x,y-hh],[x+hw,y],[x,y+hh],[x-hw,y]],'#e3d8c4');
    ctx.strokeStyle='rgba(120,100,80,.18)';ctx.lineWidth=1;
    for(let k=1;k<4;k++){const f=k/4;ctx.beginPath();ctx.moveTo(x-hw+f*hw,y-f*hh);ctx.lineTo(x+f*hw,y+hh-f*hh);ctx.stroke();ctx.beginPath();ctx.moveTo(x-hw+f*hw,y+f*hh);ctx.lineTo(x+f*hw,y-hh+f*hh);ctx.stroke()}
    const r=s*.34*Math.max(g,.01);
    ctx.fillStyle='#c9bba2';ctx.beginPath();ctx.ellipse(x,y,r,r/2,0,0,6.3);ctx.fill();
    ctx.fillStyle='#b3a487';ctx.fillRect(x-r,y-s*.08,r*2,s*.08);
    ctx.fillStyle='#d8ccb5';ctx.beginPath();ctx.ellipse(x,y-s*.08,r,r/2,0,0,6.3);ctx.fill();
    ctx.fillStyle=night>.3?'#7fd3f0':'#7cc6dc';ctx.beginPath();ctx.ellipse(x,y-s*.08,r*.8,r*.4,0,0,6.3);ctx.fill();
    const jet=s*.32*g*(1+.08*Math.sin(t*6));
    ctx.strokeStyle='rgba(230,248,255,.9)';ctx.lineWidth=Math.max(1.5,s*.035);ctx.beginPath();ctx.moveTo(x,y-s*.08);ctx.quadraticCurveTo(x,y-s*.08-jet,x+s*.06,y-s*.08-jet*.7);ctx.moveTo(x,y-s*.08);ctx.quadraticCurveTo(x,y-s*.08-jet,x-s*.06,y-s*.08-jet*.7);ctx.stroke();
    if(happy)etat.LIGHTS.push({dot:[x,y-s*.1],r:s*.5,a:night});
  }else if(type==='parc'){
    const r=s*.17*g;
    if(r>0){tree(x-s*.32,y-s*.02,r,'#6fae5a');tree(x+s*.3,y-s*.04,r*1.1,'#5f9f55');tree(x,y+s*.18,r*1.2,'#7ebc63')}
    if(happy)etat.LIGHTS.push({dot:[x-s*.05,y+s*.02],r:s*.25,a:night*.6});
  }else if(type==='bois'){
    const r=s*.16;pine(x-s*.3,y,r);pine(x+s*.28,y-s*.05,r*1.15);pine(x,y-s*.2,r*.9);pine(x+s*.02,y+s*.2,r*1.2);
  }
}
function tileTop(type){return type==='parc'?'#a8d184':type==='bois'?'#93bd7a':'#ece4cf'}
// ---------- effets ----------
export const fx=[];
export function floatText(i,txt,col){fx.push({i,txt,col,t0:performance.now()})}
export function frame(now){
  const dt=Math.min(.05,(now-etat.last)/1000);etat.last=now;const t=now/1000;
  etat.dispHour+=(etat.hour-etat.dispHour)*Math.min(1,dt*2.2);
  const [sTop,sBot,amb]=sky(etat.dispHour);
  const night=clamp((etat.dispHour-18.6)/2.6,0,1);
  ctx.setTransform(etat.DPR,0,0,etat.DPR,0,0);
  // mer
  const bg=ctx.createLinearGradient(0,0,0,etat.H);bg.addColorStop(0,sTop);bg.addColorStop(1,sBot);ctx.fillStyle=bg;ctx.fillRect(0,0,etat.W,etat.H);
  // reflets
  ctx.save();ctx.globalAlpha=.18+.12*night;ctx.strokeStyle=night>.5?'#c8d2ff':'#ffffff';ctx.lineWidth=1.2;
  for(let k=0;k<36;k++){const r=rng(k*977+3);const px=(r()*etat.W+t*6*(r()+.3))%(etat.W+80)-40,py=r()*etat.H,l=10+r()*30;ctx.globalAlpha=(.1+.15*Math.sin(t*1.2+k))*(1+night);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+l,py);ctx.stroke()}
  ctx.restore();
  if(!etat.G){requestAnimationFrame(frame);return}
  etat.LIGHTS=[];
  // halo d'eau peu profonde autour de l'île
  const order=[...Array(N*N).keys()].sort((a,b)=>((a%N)+((a/N)|0))-((b%N)+((b/N)|0))||(a%N)-(b%N));
  // le halo flouté ne change qu'avec l'île ou la taille de l'écran : on le calcule une fois puis on le recopie
  // (avant : un filtre blur par case et par image, 2 images/s sur un téléphone sans GPU rapide)
  const hk=[etat.G.seedStr,etat.W,etat.H,etat.DPR,etat.TW,etat.OX,etat.OY].join();
  if(etat.haloKey!==hk){etat.haloKey=hk;etat.haloC=etat.haloC||document.createElement('canvas');etat.haloC.width=etat.W*etat.DPR;etat.haloC.height=etat.H*etat.DPR;
    const raw=document.createElement('canvas');raw.width=etat.haloC.width;raw.height=etat.haloC.height;
    swap(/** @type {CanvasRenderingContext2D} */ (raw.getContext('2d')),()=>{ctx.setTransform(etat.DPR,0,0,etat.DPR,0,0);for(const i of order){if(!etat.G.cells[i].land)continue;const[x,y]=cellXY(i);const hw=etat.TW/2*1.25,hh=etat.TH/2*1.25;poly([[x,y-hh+etat.TH*.4],[x+hw,y+etat.TH*.4],[x,y+hh+etat.TH*.4],[x-hw,y+etat.TH*.4]],'rgba(255,255,255,.22)')}});
    const hc=/** @type {CanvasRenderingContext2D} */ (etat.haloC.getContext('2d'));hc.clearRect(0,0,etat.haloC.width,etat.haloC.height);hc.filter='blur('+Math.round(etat.TW*.25*etat.DPR)+'px)';hc.drawImage(raw,0,0);hc.filter='none'}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);if(etat.haloC)ctx.drawImage(etat.haloC,0,0);ctx.restore();
  // aperçu
  let prev=null;
  if(!etat.over&&etat.hover>=0&&etat.G.cells[etat.hover].land&&!etat.G.cells[etat.hover].type&&etat.hand[etat.sel]){
    const before=etat.G.cells.map((c,i)=>score(etat.G,i));etat.G.cells[etat.hover].type=etat.hand[etat.sel];
    const after=etat.G.cells.map((c,i)=>score(etat.G,i));etat.G.cells[etat.hover].type=null;
    prev={i:etat.hover,diff:after.map((v,i)=>v-before[i]),tot:after.reduce((a,b)=>a+b,0)-before.reduce((a,b)=>a+b,0)};
  }
  const D=etat.TH*.55;
  for(const i of order){
    const c=etat.G.cells[i];if(!c.land)continue;
    const[x,y]=cellXY(i);const hw=etat.TW/2,hh=etat.TH/2;
    // socle
    poly([[x-hw,y],[x,y+hh],[x,y+hh+D],[x-hw,y+D]],'#c8b28e');
    poly([[x,y+hh],[x+hw,y],[x+hw,y+D],[x,y+hh+D]],'#a8916f');
    let top=tileTop(c.type);
    if(prev&&prev.i===i)top=mix(top,'#ffffff',.45);
    poly([[x,y-hh],[x+hw,y],[x,y+hh],[x-hw,y]],top);
    ctx.strokeStyle='rgba(120,95,60,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-hw,y);ctx.lineTo(x,y-hh);ctx.lineTo(x+hw,y);ctx.stroke();
    if(c.type){
      const age=(now-c.born)/500;const g=c.born?easeBack(clamp(age,0,1)):1;
      const happy=score(etat.G,i)>0;
      building(c.type,x,y,hw,g,happy,night,t,i);
      if(c.type==='atelier'&&g>=1&&Math.random()<dt*1.6)etat.puffs.push({i,age:0,dx:Math.random()*.1});
    }else if(prev&&prev.i===i){
      ctx.save();ctx.globalAlpha=.6+.15*Math.sin(t*5);building(etat.hand[etat.sel],x,y,hw,1,false,0,t,i);ctx.restore();
    }
  }
  // fumée
  etat.puffs=etat.puffs.filter(p=>(p.age+=dt)<2.2&&etat.G.cells[p.i].type==='atelier');
  for(const p of etat.puffs){const[x,y]=cellXY(p.i);const s=etat.TW/2;const px=x+s*.21+p.age*s*.22+p.dx*s,py=y-s*1.02-p.age*s*.32;ctx.fillStyle=`rgba(255,255,255,${.55*(1-p.age/2.2)})`;ctx.beginPath();ctx.arc(px,py,s*(.05+p.age*.05),0,6.3);ctx.fill()}
  // lumière ambiante
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=amb;ctx.fillRect(0,0,etat.W,etat.H);ctx.restore();
  // fenêtres et lumières
  if(night>0){
    ctx.save();
    for(const L of etat.LIGHTS){
      if(L.q){ctx.globalAlpha=L.a;ctx.shadowColor='#ffcf6a';ctx.shadowBlur=etat.TW*.18;poly(L.q,'#ffd98a')}
      else if(L.dot){ctx.shadowBlur=0;ctx.globalAlpha=L.a*.55;const gr=ctx.createRadialGradient(L.dot[0],L.dot[1],0,L.dot[0],L.dot[1],L.r);gr.addColorStop(0,'rgba(255,220,140,.9)');gr.addColorStop(1,'rgba(255,220,140,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(L.dot[0],L.dot[1],L.r,0,6.3);ctx.fill()}
      else if(L.beam){ctx.shadowBlur=0;ctx.globalAlpha=L.a*.5;const[bx,by]=L.beam;const a=L.t*.9,len=etat.TW*3.2,sp=.16;const gr=ctx.createRadialGradient(bx,by,0,bx,by,len);gr.addColorStop(0,'rgba(255,236,170,.9)');gr.addColorStop(1,'rgba(255,236,170,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(a-sp)*len,by+Math.sin(a-sp)*len*.5);ctx.lineTo(bx+Math.cos(a+sp)*len,by+Math.sin(a+sp)*len*.5);ctx.closePath();ctx.fill()}
    }
    ctx.restore();
  }
  // chiffres d'aperçu
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(prev){
    prev.diff.forEach((d,i)=>{if(!d||i===prev.i)return;const[x,y]=cellXY(i);pill(x,y-etat.TH*.9,(d>0?'+':'−')+Math.abs(d),d>0?'#3aa76d':'#d9534f',etat.TW*.2)});
    const[x,y]=cellXY(prev.i);pill(x,y-etat.TW*.62,(prev.tot>=0?'+':'−')+Math.abs(prev.tot),prev.tot>0?'#3aa76d':prev.tot<0?'#d9534f':'#6b7280',etat.TW*.27);
  }
  for(let k=fx.length-1;k>=0;k--){const f=fx[k];const a=(now-f.t0)/1200;if(a>1){fx.splice(k,1);continue}const[x,y]=cellXY(f.i);ctx.globalAlpha=1-a*a;pill(x,y-etat.TW*.6-a*etat.TW*.4,f.txt,f.col,etat.TW*.25);ctx.globalAlpha=1}
  requestAnimationFrame(frame);
}
function pill(x,y,txt,col,fs){
  fs=Math.max(13,Math.min(fs,24));ctx.font=`700 ${fs}px Outfit,sans-serif`;const w=ctx.measureText(txt).width+fs*.9,h=fs*1.45;
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,h/2);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(txt,x,y+1);
}
function easeBack(x){const c1=1.7,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}
// ---------- icônes de cartes ----------
export function icon(canvas,type){
  const r=canvas.getBoundingClientRect();const w=r.width||64,h=r.height||56,d=2;
  canvas.width=w*d;canvas.height=h*d;const c2=canvas.getContext('2d');
  // carte peinte si elle est prête, sinon le bâtiment dessiné par le même moteur que l'île
  const img=art('carte_'+type);
  if(img){c2.setTransform(d,0,0,d,0,0);c2.clearRect(0,0,w,h);const z=Math.min(w,h)*1.08;c2.drawImage(img,(w-z)/2,(h-z)/2+h*.04,z,z);return}
  // dessiner avec le même moteur
  swap(c2,()=>{c2.setTransform(d,0,0,d,0,0);c2.clearRect(0,0,w,h);const s=w*.36,x=w/2,y=h*.68;
    poly([[x,y-s/2],[x+s,y],[x,y+s/2],[x-s,y]],tileTop(type));
    poly([[x-s,y],[x,y+s/2],[x,y+s/2+s*.2],[x-s,y+s*.2]],'#c8b28e');poly([[x,y+s/2],[x+s,y],[x+s,y+s*.2],[x,y+s/2+s*.2]],'#a8916f');
    building(type,x,y,s,1,false,0,0,1)});
}
function swap(c2,fn){const keep=ctx,kl=etat.LIGHTS;ctx=c2;try{fn()}finally{ctx=keep;etat.LIGHTS=kl}}
