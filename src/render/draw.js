// @ts-check
/** Pinceaux du rendu isométrique : couleurs, prismes, toits, arbres et dessin de chaque bâtiment.
 * Tout dessine dans `pen.ctx`, que l'on peut faire pointer vers un autre canvas (icônes, miniatures). */
import { etat } from '../state.js';

/** @typedef {import('../types.js').Tile} Tile */
/** @typedef {[number,number]} Pt */

/** Le contexte où l'on dessine. */
export const pen = { ctx: /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (null)) };

// ---------- couleurs ----------
/** @type {Map<string,[number,number,number]>} */
const HEX = new Map();
/** @param {string} c @returns {[number,number,number]} */
function hex(c) {
  let v = HEX.get(c);
  if (!v) { const s = c.replace('#', ''); v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; HEX.set(c, v); }
  return v;
}
/** Mélange de deux couleurs #rrggbb. @param {string} a @param {string} b @param {number} t */
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join(''); }
/** @type {Map<string,string>} */
const SHADES = new Map();
/** Plus sombre (k < 0) ou plus clair (k > 0) ; mis en cache (appelé des centaines de fois par image). @param {string} c @param {number} k */
export function shade(c, k) {
  const key = c + k; let v = SHADES.get(key);
  if (!v) { v = k < 0 ? mix(c, '#1d2240', -k) : mix(c, '#ffffff', k); SHADES.set(key, v); }
  return v;
}

// ---------- géométrie iso ----------
/** @param {number[][]} pts @param {string} fill */
export function poly(pts, fill) {
  const ctx = pen.ctx; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
/** @param {number} x @param {number} y @param {number} hw @param {number} hh @param {number} h @param {string} col */
function prism(x, y, hw, hh, h, col) {
  poly([[x - hw, y], [x, y + hh], [x, y + hh - h], [x - hw, y - h]], shade(col, -.1));
  poly([[x, y + hh], [x + hw, y], [x + hw, y - h], [x, y + hh - h]], shade(col, -.26));
  poly([[x, y - hh - h], [x + hw, y - h], [x, y + hh - h], [x - hw, y - h]], shade(col, .12));
}
/** Quadrilatère sur une face : side 'L' ou 'R', a = position le long de la base (0..1), b = hauteur (0..1).
 * @param {number} x @param {number} y @param {number} hw @param {number} hh @param {number} h @param {'L'|'R'} side
 * @param {number} a0 @param {number} a1 @param {number} b0 @param {number} b1 @returns {Pt[]} */
function fq(x, y, hw, hh, h, side, a0, a1, b0, b1) {
  /** @type {(a:number,b:number)=>Pt} */
  const P = (a, b) => side === 'L' ? [x - hw + a * hw, y + a * hh - b * h] : [x + a * hw, y + hh - a * hh - b * h];
  return [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)];
}
/** @param {number} x @param {number} y @param {number} hw @param {number} hh @param {number} h @param {number} rh @param {string} col */
function roof(x, y, hw, hh, h, rh, col) {
  /** @type {Pt} */ const ap = [x, y - h - rh];
  poly([[x - hw, y - h], [x, y + hh - h], ap], shade(col, -.02));
  poly([[x, y + hh - h], [x + hw, y - h], ap], shade(col, -.22));
}
/** @param {number} x @param {number} y @param {number} hw @param {number} hh @param {number} len */
function shadow(x, y, hw, hh, len) {
  const ctx = pen.ctx; ctx.fillStyle = 'rgba(30,25,60,.16)';
  ctx.beginPath(); ctx.moveTo(x, y + hh); ctx.lineTo(x + hw, y); ctx.lineTo(x + hw + len, y - len * .15); ctx.lineTo(x + len * .6, y + hh + len * .1); ctx.closePath(); ctx.fill();
}
/** Fenêtre, retenue pour s'allumer la nuit si le bâtiment est heureux. @param {Pt[]} q @param {boolean|number} lit @param {number} night */
function win(q, lit, night) { poly(q, '#3d4a63'); if (lit) etat.LIGHTS.push({ q, a: night }); }
/** @param {number} x @param {number} y @param {number} r @param {string} col */
function tree(x, y, r, col) {
  const ctx = pen.ctx;
  ctx.fillStyle = '#6b5040'; ctx.fillRect(x - r * .12, y - r * .9, r * .24, r * .9);
  ctx.fillStyle = 'rgba(30,25,60,.18)'; ctx.beginPath(); ctx.ellipse(x + r * .5, y, r * .9, r * .35, 0, 0, 6.3); ctx.fill();
  const gr = ctx.createRadialGradient(x - r * .35, y - r * 1.6, r * .1, x, y - r * 1.3, r * 1.1); gr.addColorStop(0, shade(col, .25)); gr.addColorStop(1, shade(col, -.2));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - r * 1.3, r, 0, 6.3); ctx.fill();
}
/** @param {number} x @param {number} y @param {number} r */
function pine(x, y, r) {
  const ctx = pen.ctx;
  ctx.fillStyle = 'rgba(30,25,60,.18)'; ctx.beginPath(); ctx.ellipse(x + r * .5, y, r * .8, r * .3, 0, 0, 6.3); ctx.fill();
  poly([[x - r * .8, y - r * .2], [x, y - r * 2.6], [x, y]], '#4c7a5c'); poly([[x, y], [x, y - r * 2.6], [x + r * .8, y - r * .2]], '#365d48');
}

/** Dessin d'un bâtiment, centre du dessus de la case (x, y), demi-largeur s, croissance g (0..1).
 * @param {Tile} type @param {number} x @param {number} y @param {number} s @param {number} g
 * @param {boolean} happy @param {number} night @param {number} t @param {number} seed */
export function building(type, x, y, s, g, happy, night, t, seed) {
  const ctx = pen.ctx;
  if (type === 'maison') {
    const hw = s * .48, hh = hw / 2, h = s * .42 * g;
    shadow(x, y, hw, hh, s * .35 * g);
    prism(x, y, hw, hh, h, '#f4eee2');
    if (g > .6) { win(fq(x, y, hw, hh, h, 'L', .22, .42, .35, .7), happy, night); win(fq(x, y, hw, hh, h, 'L', .6, .8, .35, .7), happy, night); win(fq(x, y, hw, hh, h, 'R', .4, .62, .0, .62), happy && seed % 2 === 1, night); }
    roof(x, y, hw, hh, h, s * .42 * g, '#e2725b');
  } else if (type === 'boutique') {
    const hw = s * .56, hh = hw / 2, h = s * .36 * g;
    shadow(x, y, hw, hh, s * .3 * g);
    prism(x, y, hw, hh, h, '#f2c14e');
    if (g > .6) {
      win(fq(x, y, hw, hh, h, 'L', .15, .85, .12, .55), happy, night); win(fq(x, y, hw, hh, h, 'R', .15, .85, .12, .55), happy, night);
      for (let k = 0; k < 6; k++) { poly(fq(x, y, hw, hh, h, 'L', k / 6, (k + 1) / 6, .62, .84), k % 2 ? '#fffaf0' : '#e2725b'); poly(fq(x, y, hw, hh, h, 'R', k / 6, (k + 1) / 6, .62, .84), k % 2 ? shade('#fffaf0', -.15) : shade('#e2725b', -.15)); }
    }
  } else if (type === 'atelier') {
    const hw = s * .6, hh = hw / 2, h = s * .5 * g;
    shadow(x, y, hw, hh, s * .45 * g);
    prism(x, y, hw, hh, h, '#6f7f92');
    if (g > .6) {
      for (let k = 0; k < 3; k++) { win(fq(x, y, hw, hh, h, 'L', .1 + k * .28, .3 + k * .28, .45, .75), happy, night); win(fq(x, y, hw, hh, h, 'R', .1 + k * .28, .3 + k * .28, .45, .75), happy && k !== 1, night); }
      const cx = x + hw * .35, cy = y - h - hh * .25; prism(cx, cy, s * .09, s * .045, s * .42 * g, '#c9604c'); // cheminée
    }
  } else if (type === 'phare') {
    const hw = s * .2, hh = hw / 2, h = s * 1.25 * g;
    shadow(x, y, hw, hh, s * .9 * g);
    prism(x, y, hw, hh, h, '#f7f3ea');
    for (let k = 0; k < 3; k++) { const b0 = .12 + k * .28; poly(fq(x, y, hw, hh, h, 'L', 0, 1, b0, b0 + .14), shade('#e2725b', -.05)); poly(fq(x, y, hw, hh, h, 'R', 0, 1, b0, b0 + .14), shade('#e2725b', -.22)); }
    const ly = y - h; prism(x, ly, hw * .85, hh * .85, s * .2 * g, night > .2 ? '#ffe08a' : '#cfe7ee');
    roof(x, ly, hw * 1.05, hh * 1.05, s * .2 * g, s * .18 * g, '#2f3a55');
    if (night > .05 && g > .9) etat.LIGHTS.push({ beam: [x, ly - s * .1], a: night, t });
  } else if (type === 'place') {
    const hw = s * .82, hh = hw / 2; // pavés
    poly([[x, y - hh], [x + hw, y], [x, y + hh], [x - hw, y]], '#e3d8c4');
    ctx.strokeStyle = 'rgba(120,100,80,.18)'; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { const f = k / 4; ctx.beginPath(); ctx.moveTo(x - hw + f * hw, y - f * hh); ctx.lineTo(x + f * hw, y + hh - f * hh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - hw + f * hw, y + f * hh); ctx.lineTo(x + f * hw, y - hh + f * hh); ctx.stroke(); }
    const r = s * .34 * Math.max(g, .01);
    ctx.fillStyle = '#c9bba2'; ctx.beginPath(); ctx.ellipse(x, y, r, r / 2, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#b3a487'; ctx.fillRect(x - r, y - s * .08, r * 2, s * .08);
    ctx.fillStyle = '#d8ccb5'; ctx.beginPath(); ctx.ellipse(x, y - s * .08, r, r / 2, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = night > .3 ? '#7fd3f0' : '#7cc6dc'; ctx.beginPath(); ctx.ellipse(x, y - s * .08, r * .8, r * .4, 0, 0, 6.3); ctx.fill();
    const jet = s * .32 * g * (1 + .08 * Math.sin(t * 6));
    ctx.strokeStyle = 'rgba(230,248,255,.9)'; ctx.lineWidth = Math.max(1.5, s * .035); ctx.beginPath(); ctx.moveTo(x, y - s * .08); ctx.quadraticCurveTo(x, y - s * .08 - jet, x + s * .06, y - s * .08 - jet * .7); ctx.moveTo(x, y - s * .08); ctx.quadraticCurveTo(x, y - s * .08 - jet, x - s * .06, y - s * .08 - jet * .7); ctx.stroke();
    if (happy) etat.LIGHTS.push({ dot: [x, y - s * .1], r: s * .5, a: night });
  } else if (type === 'parc') {
    const r = s * .17 * g;
    if (r > 0) { tree(x - s * .32, y - s * .02, r, '#6fae5a'); tree(x + s * .3, y - s * .04, r * 1.1, '#5f9f55'); tree(x, y + s * .18, r * 1.2, '#7ebc63'); }
    if (happy) etat.LIGHTS.push({ dot: [x - s * .05, y + s * .02], r: s * .25, a: night * .6 });
  } else if (type === 'bois') {
    const r = s * .16; pine(x - s * .3, y, r); pine(x + s * .28, y - s * .05, r * 1.15); pine(x, y - s * .2, r * .9); pine(x + s * .02, y + s * .2, r * 1.2);
  }
}
/** Couleur du dessus d'une case. @param {Tile|null} type */
export function tileTop(type) { return type === 'parc' ? '#a8d184' : type === 'bois' ? '#93bd7a' : '#ece4cf'; }
/** Pastille de texte (chiffres d'aperçu et de gain). @param {number} x @param {number} y @param {string} txt @param {string} col @param {number} fs */
export function pill(x, y, txt, col, fs) {
  const ctx = pen.ctx;
  fs = Math.max(13, Math.min(fs, 24)); ctx.font = `700 ${fs}px Outfit,sans-serif`; const w = ctx.measureText(txt).width + fs * .9, h = fs * 1.45;
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y + 1);
}
/** Dessine dans un autre contexte le temps de `fn` (les lumières de ce dessin sont jetées).
 * @param {CanvasRenderingContext2D} c2 @param {()=>void} fn */
export function swap(c2, fn) { const keep = pen.ctx, kl = etat.LIGHTS; pen.ctx = c2; etat.LIGHTS = []; try { fn(); } finally { pen.ctx = keep; etat.LIGHTS = kl; } }
