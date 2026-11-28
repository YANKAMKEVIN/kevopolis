// @ts-check
/** Règles du jeu (sans DOM) : bâtiments, sac de cartes, vœux, score de chaque case, étoiles. */

/** @typedef {import('./types.js').Kind} Kind */
/** @typedef {import('./types.js').Tile} Tile */
/** @typedef {import('./types.js').Island} Island */
/** @typedef {import('./types.js').Goal} Goal */
/** @typedef {import('./types.js').Stars} Stars */

/** Version du jeu, affichée sur l'écran d'accueil (garder égale à package.json). */
export const VERSION = '1.2.0';
// ---------- données ----------
export const N = 7, START = 6, END = 24, REROLLS = 2;
/** Les bâtiments posables, dans l'ordre des règles. @type {readonly Kind[]} */
export const KINDS = ['maison', 'parc', 'boutique', 'atelier', 'place', 'phare'];
/** @type {Record<Tile,{nom:string,regle:string}>} */
export const T = {
  maison:  {nom:'Maison',  regle:'1, +1 par maison voisine'},
  parc:    {nom:'Parc',    regle:'+1 par maison voisine, +1 au bord de l\'eau'},
  boutique:{nom:'Boutique',regle:'+1 par maison ou atelier voisin'},
  atelier: {nom:'Atelier', regle:'3, −2 par maison voisine'},
  place:   {nom:'Place',   regle:'+1 par type de voisin différent'},
  phare:   {nom:'Phare',   regle:'4 au bord de l\'eau, sinon 0'},
  bois:    {nom:'Bois',    regle:'ne se construit pas'}
};
/** Le sac de 30 cartes d'une île classique. @type {Readonly<Record<Kind,number>>} */
export const BAG = {maison:10,parc:5,boutique:5,atelier:5,place:3,phare:2};
/** Seuils d'étoiles d'une île classique. @type {Stars} */
export const STARS = [40, 54, 66];

// ---------- outils ----------
/** Générateur pseudo-aléatoire déterministe (mulberry32). @param {number} seed */
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/** Empreinte FNV-1a d'un texte. @param {string} s */
export function hash(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
/** @param {number} x @param {number} a @param {number} b */
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Voisins d'une case (côtés seulement). @param {number} i @returns {number[]} */
export function nb(i){const x=i%N,y=(i/N)|0,r=[];if(x>0)r.push(i-1);if(x<N-1)r.push(i+1);if(y>0)r.push(i-N);if(y<N-1)r.push(i+N);return r}
/** Case au bord de l'eau : bord de la carte ou voisine de la mer. @param {Island} g @param {number} i */
export function coast(g,i){const x=i%N,y=(i/N)|0;if(x===0||y===0||x===N-1||y===N-1)return true;return nb(i).some(j=>!g.cells[j].land)}
/** Taille du plus grand groupe de cases d'un type qui se touchent. @param {Island} g @param {Tile} type */
export function biggest(g,type){
  const seen=new Set();let best=0;
  g.cells.forEach((c,i)=>{
    if(c.type!==type||seen.has(i))return;
    let n=0;const st=[i];seen.add(i);
    while(st.length){const k=/** @type {number} */(st.pop());n++;for(const j of nb(k))if(!seen.has(j)&&g.cells[j].type===type){seen.add(j);st.push(j)}}
    best=Math.max(best,n);
  });
  return best;
}
/** Nombre de voisins de la case i d'un type donné. @param {Island} g @param {number} i @param {Tile} t */
export const around=(g,i,t)=>nb(i).filter(j=>g.cells[j].type===t).length;
/** Points rapportés par la case i (0 si vide ou bois). @param {Island} g @param {number} i @returns {number} */
export function score(g,i){
  const c=g.cells[i];if(!c.type)return 0;
  switch(c.type){
    case 'maison':return 1+around(g,i,'maison');
    case 'parc':return around(g,i,'maison')+(coast(g,i)?1:0);
    case 'boutique':return around(g,i,'maison')+around(g,i,'atelier');
    case 'atelier':return 3-2*around(g,i,'maison');
    case 'place':{const s=new Set();for(const j of nb(i)){const t=g.cells[j].type;if(t&&t!=='bois')s.add(t)}return s.size}
    case 'phare':return coast(g,i)?4:0;
    default:return 0;
  }
}
/** Somme des points des cases. @param {Island} g */
export const total=g=>g.cells.reduce((s,_c,i)=>s+score(g,i),0);

// ---------- vœux ----------
/** Les huit vœux des îles du jour et au hasard ; trois sont tirés pour chaque île. @type {readonly Goal[]} */
export const GOALS = [
  {id:'ronde', txt:'Un parc entouré de 3 maisons', test:g=>g.cells.some((c,i)=>c.type==='parc'&&around(g,i,'maison')>=3)},
  {id:'phare', txt:'Un phare qui éclaire la mer', test:g=>g.cells.some((c,i)=>c.type==='phare'&&coast(g,i))},
  {id:'marche',txt:'Quatre boutiques en ville', test:g=>g.cells.filter(c=>c.type==='boutique').length>=4},
  {id:'quart', txt:'Un quartier de 5 maisons qui se touchent', test:g=>biggest(g,'maison')>=5},
  {id:'usine', txt:'Deux ateliers côte à côte', test:g=>biggest(g,'atelier')>=2},
  {id:'carre', txt:'Une place avec 3 voisins différents', test:g=>g.cells.some((c,i)=>c.type==='place'&&score(g,i)>=3)},
  {id:'troc',  txt:'Une boutique entre deux ateliers', test:g=>g.cells.some((c,i)=>c.type==='boutique'&&around(g,i,'atelier')>=2)},
  {id:'vert',  txt:'Trois parcs au bord de l\'eau', test:g=>g.cells.filter((c,i)=>c.type==='parc'&&coast(g,i)).length>=3}
];
/** Vœux propres aux îles de l'archipel (ne changent pas le tirage des îles classiques). @type {readonly Goal[]} */
export const EXTRA_GOALS = [
  {id:'veille', txt:'Deux phares au bord de l\'eau', test:g=>g.cells.filter((c,i)=>c.type==='phare'&&coast(g,i)).length>=2},
  {id:'coeur',  txt:'Une place entourée de 4 bâtiments', test:g=>g.cells.some((c,i)=>c.type==='place'&&nb(i).length===4&&nb(i).every(j=>{const t=g.cells[j].type;return !!t&&t!=='bois'}))},
  {id:'calme',  txt:'Trois ateliers loin des maisons', test:g=>g.cells.filter((c,i)=>c.type==='atelier'&&around(g,i,'maison')===0).length>=3},
  {id:'lisiere',txt:'Un parc à côté d\'un bois', test:g=>g.cells.some((c,i)=>c.type==='parc'&&around(g,i,'bois')>=1)},
  {id:'rue',    txt:'Une rue de 3 boutiques qui se touchent', test:g=>biggest(g,'boutique')>=3},
  {id:'ville',  txt:'Un quartier de 8 maisons qui se touchent', test:g=>biggest(g,'maison')>=8}
];
/** Tous les vœux. */
export const ALL_GOALS = [...GOALS, ...EXTRA_GOALS];
/** Le vœu d'identifiant id (erreur s'il n'existe pas). @param {string} id @returns {Goal} */
export function goal(id){const g=ALL_GOALS.find(x=>x.id===id);if(!g)throw new Error('vœu inconnu : '+id);return g}
/** Identifiants des vœux réalisés. @param {Island} g */
export const goalsDone=g=>g.goals.filter(k=>goal(k).test(g));
/** Habitants : points des cases + 5 par vœu réalisé. @param {Island} g */
export const fullScore=g=>total(g)+5*goalsDone(g).length;
/** Étoiles (0 à 3) pour un score. @param {number} s @param {Stars} [th] */
export function stars(s,th=STARS){return s>=th[2]?3:s>=th[1]?2:s>=th[0]?1:0}
/** Nom d'île au hasard (5 lettres ou chiffres). */
export function randomName(){return Math.random().toString(36).slice(2,7).padEnd(5,'0')}
