// @ts-check
/** Génération des îles à partir d'une graine (sans DOM) : formes de carte, bois, sac de cartes, vœux. */
import { BAG, GOALS, N, STARS, hash, nb, rng } from './rules.js';

/** @typedef {import('./types.js').Kind} Kind */
/** @typedef {import('./types.js').Cell} Cell */
/** @typedef {import('./types.js').Island} Island */
/** @typedef {import('./types.js').Stars} Stars */
/** Une forme de carte : nom, nombre de cases de terre permis, d'un seul tenant ou non,
 * et la fonction qui dit si (x, y) est de la terre (elle tire ses paramètres avec r).
 * @typedef {{nom:string,min:number,max:number,connected:boolean,mask:(r:()=>number)=>(x:number,y:number)=>boolean}} Shape */

const C = (N - 1) / 2;
const TAU = 6.28;
/** Distance d'un point au segment [a, b]. @param {number} px @param {number} py @param {number} ax @param {number} ay @param {number} bx @param {number} by */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
  return Math.hypot(px - ax - t * vx, py - ay - t * vy);
}

/** Les formes de carte. « ronde » est la forme d'origine, inchangée (mêmes îles pour les mêmes graines). @type {Record<string,Shape>} */
export const SHAPES = {
  ronde: { nom: 'Ronde', min: 28, max: 36, connected: true, mask: r => {
    const ph = [r() * TAU, r() * TAU, r() * TAU];
    return (x, y) => { const dx = x - C, dy = y - C, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
      return d < 3.05 + .55 * Math.sin(2 * a + ph[0]) + .4 * Math.sin(3 * a + ph[1]) + .25 * Math.sin(5 * a + ph[2]); };
  } },
  atoll: { nom: 'Atoll', min: 24, max: 36, connected: true, mask: r => {
    const ph = r() * TAU, lx = C + (r() - .5) * .8, ly = C + (r() - .5) * .8;
    return (x, y) => { const d = Math.hypot(x - C, y - C), a = Math.atan2(y - C, x - C);
      return d < 3.3 + .3 * Math.sin(3 * a + ph) && Math.hypot(x - lx, y - ly) > 1.2; };
  } },
  croissant: { nom: 'Croissant', min: 24, max: 32, connected: true, mask: r => {
    const a0 = r() * TAU, ph = r() * TAU, bx = C + Math.cos(a0) * 2.2, by = C + Math.sin(a0) * 2.2;
    return (x, y) => { const a = Math.atan2(y - C, x - C);
      return Math.hypot(x - C, y - C) < 3.5 + .25 * Math.sin(2 * a + ph) && Math.hypot(x - bx, y - by) > 2.0; };
  } },
  jumelles: { nom: 'Jumelles', min: 24, max: 34, connected: true, mask: r => {
    const a0 = r() * TAU, k = 1.8 + r() * .3, ra = 1.95 + r() * .3, rb = 1.85 + r() * .3;
    const ax = C + Math.cos(a0) * k, ay = C + Math.sin(a0) * k, bx = C - Math.cos(a0) * k, by = C - Math.sin(a0) * k;
    return (x, y) => Math.hypot(x - ax, y - ay) < ra || Math.hypot(x - bx, y - by) < rb || segDist(x, y, ax, ay, bx, by) < .55;
  } },
  longue: { nom: 'Presqu\'île', min: 24, max: 32, connected: true, mask: r => {
    const a0 = (r() < .5 ? .785 : 2.356) + (r() - .5) * .4, ph = r() * TAU, ca = Math.cos(a0), sa = Math.sin(a0);
    return (x, y) => { const dx = x - C, dy = y - C, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      return (u / 4.1) ** 2 + (v / (2 + .25 * Math.sin(u * 1.3 + ph))) ** 2 < 1; };
  } },
  ilots: { nom: 'Trois îlots', min: 24, max: 32, connected: false, mask: r => {
    const a0 = r() * TAU, pts = [0, 1, 2].map(k => { const a = a0 + k * TAU / 3, d = 1.9 + r() * .5; return [C + Math.cos(a) * d, C + Math.sin(a) * d, 1.6 + r() * .35]; });
    return (x, y) => pts.some(([px, py, pr]) => Math.hypot(x - px, y - py) < pr);
  } },
};
/** Ordre de rotation des formes pour l'île du jour. */
export const SHAPE_IDS = Object.keys(SHAPES);

/** Groupes de cases de terre qui se touchent. @param {Cell[]} cells @returns {number[][]} */
export function components(cells) {
  const seen = new Set(), out = [];
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i].land || seen.has(i)) continue;
    const cur = [], st = [i]; seen.add(i);
    while (st.length) { const k = /** @type {number} */ (st.pop()); cur.push(k); for (const j of nb(k)) if (cells[j].land && !seen.has(j)) { seen.add(j); st.push(j); } }
    out.push(cur);
  }
  return out;
}

/** Sac de cartes d'après une composition. @param {Readonly<Record<Kind,number>>} comp @returns {Kind[]} */
export function bagOf(comp) {
  /** @type {Kind[]} */ const bag = [];
  for (const [k, n] of /** @type {[Kind,number][]} */ (Object.entries(comp))) for (let i = 0; i < n; i++) bag.push(k);
  return bag;
}

/** Options d'une île : forme, vœux imposés (sinon trois tirés parmi les vœux classiques),
 * composition du sac, seuils d'étoiles.
 * @typedef {{shape?:string,goals?:string[],bag?:Readonly<Record<Kind,number>>,stars?:Stars}} IslandOpts */

/** Île de la forme demandée, deux bois, sac mélangé, trois vœux ; tout dépend de la graine.
 * Avec les options par défaut, c'est exactement l'île d'origine.
 * @param {string} seedStr @param {IslandOpts} [opts] @returns {Island} */
export function makeIsland(seedStr, opts = {}) {
  const shapeId = opts.shape || 'ronde', sh = SHAPES[shapeId];
  if (!sh) throw new Error('forme inconnue : ' + shapeId);
  for (let tries = 0; tries < 200; tries++) {
    const r = rng(hash(seedStr + '#' + tries));
    const m = sh.mask(r);
    /** @type {Cell[]} */ const cells = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ land: m(x, y), type: null, born: 0 });
    const comps = components(cells).sort((a, b) => b.length - a.length);
    // d'un seul tenant : la plus grande composante ; îlots : ceux d'au moins 4 cases
    const keep = new Set(sh.connected ? comps[0] || [] : comps.filter(c => c.length >= 4).flat());
    cells.forEach((cl, i) => { if (!keep.has(i)) cl.land = false; });
    if (keep.size < sh.min || keep.size > sh.max) continue;
    if (!sh.connected && comps.filter(c => c.length >= 4).length < 2) continue;
    // deux bois, jamais côte à côte
    const land = [...keep].sort((a, b) => a - b);
    let placed = 0;
    while (placed < 2) { const k = land[(r() * land.length) | 0]; if (!cells[k].type && nb(k).every(j => cells[j].type !== 'bois')) { cells[k].type = 'bois'; placed++; } }
    // sac de cartes mélangé
    const bag = bagOf(opts.bag || BAG);
    for (let i = bag.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; }
    // trois vœux
    let goals = opts.goals ? opts.goals.slice() : [];
    if (!opts.goals) { const pool = GOALS.map(x => x.id); while (goals.length < 3) goals.push(pool.splice((r() * pool.length) | 0, 1)[0]); }
    return { cells, seedStr, bag, goals, shape: shapeId, stars: opts.stars || STARS };
  }
  throw new Error('île impossible à générer : ' + seedStr + ' (' + shapeId + ')');
}
