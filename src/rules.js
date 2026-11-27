// @ts-check
/** Règles du jeu (sans DOM) : bâtiments, sac de cartes, vœux, score de chaque case, génération de l'île à partir d'une graine. */

/** Version du jeu, affichée sur l'écran d'accueil (garder égale à package.json). */
export const VERSION = '1.1.0';
// ---------- données ----------
export const N = 7, START = 6, END = 24, REROLLS = 2;
export const T = {
  maison:  {nom:'Maison',  regle:'1, +1 par maison voisine'},
  parc:    {nom:'Parc',    regle:'+1 par maison voisine, +1 au bord de l\'eau'},
  boutique:{nom:'Boutique',regle:'+1 par maison ou atelier voisin'},
  atelier: {nom:'Atelier', regle:'3, −2 par maison voisine'},
  place:   {nom:'Place',   regle:'+1 par type de voisin différent'},
  phare:   {nom:'Phare',   regle:'4 au bord de l\'eau, sinon 0'},
  bois:    {nom:'Bois'}
};
export const BAG = {maison:10,parc:5,boutique:5,atelier:5,place:3,phare:2};
/** Les vœux possibles ; trois sont tirés pour chaque île.
 * @type {{id:string,txt:string,test:(g:import('./state.js').Island)=>boolean}[]} */
export const GOALS = [
  {id:'ronde', txt:'Un parc entouré de 3 maisons', test:g=>g.cells.some((c,i)=>c.type==='parc'&&nb(i).filter(j=>g.cells[j].type==='maison').length>=3)},
  {id:'phare', txt:'Un phare qui éclaire la mer', test:g=>g.cells.some((c,i)=>c.type==='phare'&&coast(g,i))},
  {id:'marche',txt:'Quatre boutiques en ville', test:g=>g.cells.filter(c=>c.type==='boutique').length>=4},
  {id:'quart', txt:'Un quartier de 5 maisons qui se touchent', test:g=>biggest(g,'maison')>=5},
  {id:'usine', txt:'Deux ateliers côte à côte', test:g=>biggest(g,'atelier')>=2},
  {id:'carre', txt:'Une place avec 3 voisins différents', test:g=>g.cells.some((c,i)=>c.type==='place'&&score(g,i)>=3)},
  {id:'troc',  txt:'Une boutique entre deux ateliers', test:g=>g.cells.some((c,i)=>c.type==='boutique'&&nb(i).filter(j=>g.cells[j].type==='atelier').length>=2)},
  {id:'vert',  txt:'Trois parcs au bord de l\'eau', test:g=>g.cells.filter((c,i)=>c.type==='parc'&&coast(g,i)).length>=3}
];
// ---------- outils ----------
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function nb(i){const x=i%N,y=(i/N)|0,r=[];if(x>0)r.push(i-1);if(x<N-1)r.push(i+1);if(y>0)r.push(i-N);if(y<N-1)r.push(i+N);return r}
export function coast(g,i){const x=i%N,y=(i/N)|0;if(x===0||y===0||x===N-1||y===N-1)return true;return nb(i).some(j=>!g.cells[j].land)}
export function biggest(g,type){const seen=new Set();let best=0;g.cells.forEach((c,i)=>{if(c.type!==type||seen.has(i))return;let n=0;const st=[i];seen.add(i);while(st.length){const k=st.pop();n++;for(const j of nb(k))if(!seen.has(j)&&g.cells[j].type===type){seen.add(j);st.push(j)}}best=Math.max(best,n)});return best}
export function score(g,i){
  const c=g.cells[i];if(!c.type)return 0;
  const ns=nb(i).map(j=>g.cells[j].type);const cnt=t=>ns.filter(x=>x===t).length;
  switch(c.type){
    case 'maison':return 1+cnt('maison');
    case 'parc':return cnt('maison')+(coast(g,i)?1:0);
    case 'boutique':return cnt('maison')+cnt('atelier');
    case 'atelier':return 3-2*cnt('maison');
    case 'place':return new Set(ns.filter(t=>t&&t!=='bois')).size;
    case 'phare':return coast(g,i)?4:0;
  }return 0;
}
export const total=g=>g.cells.reduce((s,c,i)=>s+score(g,i),0);
/** Le vœu d'identifiant id. @param {string} id */
export const goal=id=>/** @type {typeof GOALS[number]} */ (GOALS.find(x=>x.id===id));
export const goalsDone=g=>g.goals.filter(k=>goal(k).test(g));
export const fullScore=g=>total(g)+5*goalsDone(g).length;
// ---------- génération de l'île ----------
/** Île de 28 à 36 cases de terre, deux bois, sac de 30 cartes mélangé, trois vœux ; tout dépend de la graine.
 * @param {string} seedStr @returns {import('./state.js').Island} */
export function makeIsland(seedStr){
  for(let tries=0;tries<50;tries++){
    const r=rng(hash(seedStr+'#'+tries));
    const cells=[];const c=(N-1)/2;
    const ph=[r()*6.28,r()*6.28,r()*6.28];
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const dx=x-c,dy=y-c,a=Math.atan2(dy,dx),d=Math.hypot(dx,dy);
      const rad=3.05+.55*Math.sin(2*a+ph[0])+.4*Math.sin(3*a+ph[1])+.25*Math.sin(5*a+ph[2]);
      cells.push({land:d<rad,type:/** @type {string|null} */ (null),born:0});
    }
    // plus grande composante
    const seen=new Set();let comp=[];
    cells.forEach((cl,i)=>{if(!cl.land||seen.has(i))return;const cur=[];const st=[i];seen.add(i);while(st.length){const k=st.pop();cur.push(k);for(const j of nb(k))if(cells[j].land&&!seen.has(j)){seen.add(j);st.push(j)}}if(cur.length>comp.length)comp=cur});
    const keep=new Set(comp);cells.forEach((cl,i)=>{if(!keep.has(i))cl.land=false});
    if(comp.length<28||comp.length>36)continue;
    /** @type {any} */
    const g={cells,seedStr};
    // deux bois
    let placed=0;const land=comp.slice().sort((a,b)=>a-b);
    while(placed<2){const k=land[(r()*land.length)|0];if(!cells[k].type&&nb(k).every(j=>cells[j].type!=='bois')){cells[k].type='bois';placed++}}
    // sac de cartes
    const bag=[];for(const [k,n] of Object.entries(BAG))for(let i=0;i<n;i++)bag.push(k);
    for(let i=bag.length-1;i>0;i--){const j=(r()*(i+1))|0;[bag[i],bag[j]]=[bag[j],bag[i]]}
    // trois vœux
    const pool=GOALS.map(x=>x.id);const goals=[];
    while(goals.length<3){const k=pool.splice((r()*pool.length)|0,1)[0];goals.push(k)}
    g.bag=bag;g.goals=goals;
    return g;
  }
  throw new Error('île impossible à générer : '+seedStr);
}
/** Nom d'île au hasard (5 lettres ou chiffres). */
export function randomName(){return Math.random().toString(36).slice(2,7).padEnd(5,'0')}
export function stars(s){return s>=66?3:s>=54?2:s>=40?1:0}
