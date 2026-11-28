// @ts-check
/** La boucle d'affichage : ciel selon l'heure, halo d'eau, île, bâtiments, lumières, chiffres flottants.
 * Pensée pour le téléphone : rien de recalculé qui n'a pas changé (ordre des cases, reflets, scores,
 * aperçu, halo flouté), et la boucle s'arrête quand l'onglet est caché. */
import { N, clamp, rng, score } from '../rules.js';
import { etat } from '../state.js';
import { building, mix, pen, pill, poly, swap, tileTop } from './draw.js';
import { cellXY } from './view.js';

/** Ordre de dessin des cases, du fond vers l'avant (ne dépend que de N). */
const ORDER = [...Array(N * N).keys()].sort((a, b) => ((a % N) + ((a / N) | 0)) - ((b % N) + ((b / N) | 0)) || (a % N) - (b % N));
/** Reflets sur la mer : position, vitesse, longueur tirées une fois pour toutes. */
const RIPPLES = Array.from({ length: 36 }, (_, k) => { const r = rng(k * 977 + 3); return { x: r(), v: r() + .3, y: r(), l: 10 + r() * 30 }; });

/** [heure, haut du ciel, bas du ciel, lumière ambiante] @type {[number,string,string,string][]} */
const SKY = [
  [6, '#f6c1a6', '#8fb7c8', '#ffd6c4'],
  [8.5, '#aedfe0', '#5fb0be', '#fff6ec'],
  [13, '#94d6df', '#4aa4b8', '#ffffff'],
  [16.5, '#f3cf96', '#6aa2b8', '#ffe8c8'],
  [19, '#e8907e', '#4d5e90', '#e9b2a8'],
  [21, '#2d3768', '#1a2246', '#7a83bb'],
  [24, '#131938', '#0a0f28', '#5d64a6']];
/** Couleurs du ciel à l'heure h. @param {number} h @returns {[string,string,string]} */
export function sky(h) {
  for (let k = 0; k < SKY.length - 1; k++) { const a = SKY[k], b = SKY[k + 1]; if (h <= b[0]) { const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1); return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)]; } }
  const l = SKY[SKY.length - 1]; return [l[1], l[2], l[3]];
}

/** Chiffres qui s'envolent après une pose. @type {{i:number,txt:string,col:string,t0:number}[]} */
export const fx = [];
/** @param {number} i @param {string} txt @param {string} col */
export function floatText(i, txt, col) { fx.push({ i, txt, col, t0: performance.now() }); }

// ---------- caches ----------
let happyRev = -1;
/** Les cases qui rapportent (fenêtres allumées), recalculées seulement quand l'île change. @type {boolean[]} */
let happy = [];
function happyCells() {
  if (happyRev !== etat.rev) { happyRev = etat.rev; happy = etat.G.cells.map((_c, i) => score(etat.G, i) > 0); }
  return happy;
}
let prevKey = '';
/** @type {{i:number,diff:number[],tot:number}|null} */
let prevCache = null;
/** Aperçu du coup sous le curseur : gains et pertes de chaque case ; recalculé seulement si la case, la carte ou l'île change. */
function preview() {
  const i = etat.hover, type = etat.hand[etat.sel];
  if (etat.over || i < 0 || !type || !etat.G.cells[i].land || etat.G.cells[i].type) return null;
  const key = etat.rev + '|' + i + '|' + type;
  if (key !== prevKey) {
    prevKey = key;
    const before = etat.G.cells.map((_c, k) => score(etat.G, k)); etat.G.cells[i].type = type;
    const after = etat.G.cells.map((_c, k) => score(etat.G, k)); etat.G.cells[i].type = null;
    prevCache = { i, diff: after.map((v, k) => v - before[k]), tot: after.reduce((a, b) => a + b, 0) - before.reduce((a, b) => a + b, 0) };
  }
  return prevCache;
}
/** Le halo d'eau peu profonde, flouté, ne change qu'avec l'île ou la taille de l'écran : calculé une fois puis recopié. */
function halo() {
  const hk = [etat.G.seedStr, etat.W, etat.H, etat.DPR, etat.TW, etat.OX, etat.OY].join();
  if (etat.haloKey !== hk) {
    etat.haloKey = hk; const hc0 = etat.haloC = etat.haloC || document.createElement('canvas');
    hc0.width = etat.W * etat.DPR; hc0.height = etat.H * etat.DPR;
    const raw = document.createElement('canvas'); raw.width = hc0.width; raw.height = hc0.height;
    const rc = /** @type {CanvasRenderingContext2D} */ (raw.getContext('2d'));
    swap(rc, () => {
      rc.setTransform(etat.DPR, 0, 0, etat.DPR, 0, 0);
      for (const i of ORDER) { if (!etat.G.cells[i].land) continue; const [x, y] = cellXY(i); const hw = etat.TW / 2 * 1.25, hh = etat.TH / 2 * 1.25, o = etat.TH * .4; poly([[x, y - hh + o], [x + hw, y + o], [x, y + hh + o], [x - hw, y + o]], 'rgba(255,255,255,.22)'); }
    });
    const hc = /** @type {CanvasRenderingContext2D} */ (hc0.getContext('2d')); hc.clearRect(0, 0, hc0.width, hc0.height);
    hc.filter = 'blur(' + Math.round(etat.TW * .25 * etat.DPR) + 'px)'; hc.drawImage(raw, 0, 0); hc.filter = 'none';
  }
  const ctx = pen.ctx; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (etat.haloC) ctx.drawImage(etat.haloC, 0, 0); ctx.restore();
}
/** @param {number} x */
function easeBack(x) { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

/** Dessine une image. @param {number} now */
export function draw(now) {
  const ctx = pen.ctx;
  const dt = Math.min(.05, Math.max(0, (now - etat.last) / 1000)); etat.last = now; const t = now / 1000;
  etat.dispHour += (etat.hour - etat.dispHour) * Math.min(1, dt * 2.2);
  const [sTop, sBot, amb] = sky(etat.dispHour);
  const night = clamp((etat.dispHour - 18.6) / 2.6, 0, 1);
  ctx.setTransform(etat.DPR, 0, 0, etat.DPR, 0, 0);
  // mer et reflets
  const bg = ctx.createLinearGradient(0, 0, 0, etat.H); bg.addColorStop(0, sTop); bg.addColorStop(1, sBot); ctx.fillStyle = bg; ctx.fillRect(0, 0, etat.W, etat.H);
  ctx.save(); ctx.strokeStyle = night > .5 ? '#c8d2ff' : '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < RIPPLES.length; k++) {
    const R = RIPPLES[k], px = (R.x * etat.W + t * 6 * R.v) % (etat.W + 80) - 40, py = R.y * etat.H;
    ctx.globalAlpha = Math.max(0, (.1 + .15 * Math.sin(t * 1.2 + k)) * (1 + night)); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + R.l, py); ctx.stroke();
  }
  ctx.restore();
  if (!etat.G) return;
  etat.LIGHTS.length = 0;
  halo();
  const prev = preview(), hap = happyCells();
  const D = etat.TH * .55, hw = etat.TW / 2, hh = etat.TH / 2;
  for (const i of ORDER) {
    const c = etat.G.cells[i]; if (!c.land) continue;
    const [x, y] = cellXY(i);
    poly([[x - hw, y], [x, y + hh], [x, y + hh + D], [x - hw, y + D]], '#c8b28e'); // socle
    poly([[x, y + hh], [x + hw, y], [x + hw, y + D], [x, y + hh + D]], '#a8916f');
    let top = tileTop(c.type);
    if (prev && prev.i === i) top = mix(top, '#ffffff', .45);
    poly([[x, y - hh], [x + hw, y], [x, y + hh], [x - hw, y]], top);
    ctx.strokeStyle = 'rgba(120,95,60,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.lineTo(x, y - hh); ctx.lineTo(x + hw, y); ctx.stroke();
    if (c.type) {
      const age = (now - c.born) / 500, g = c.born ? easeBack(clamp(age, 0, 1)) : 1;
      building(c.type, x, y, hw, g, hap[i], night, t, i);
      if (c.type === 'atelier' && g >= 1 && Math.random() < dt * 1.6) etat.puffs.push({ i, age: 0, dx: Math.random() * .1 });
    } else if (prev && prev.i === i) {
      const ty = etat.hand[etat.sel];
      if (ty) { ctx.save(); ctx.globalAlpha = .6 + .15 * Math.sin(t * 5); building(ty, x, y, hw, 1, false, 0, t, i); ctx.restore(); }
    }
  }
  // fumée
  etat.puffs = etat.puffs.filter(p => (p.age += dt) < 2.2 && etat.G.cells[p.i].type === 'atelier');
  for (const p of etat.puffs) { const [x, y] = cellXY(p.i); const s = etat.TW / 2; const px = x + s * .21 + p.age * s * .22 + p.dx * s, py = y - s * 1.02 - p.age * s * .32; ctx.fillStyle = `rgba(255,255,255,${.55 * (1 - p.age / 2.2)})`; ctx.beginPath(); ctx.arc(px, py, s * (.05 + p.age * .05), 0, 6.3); ctx.fill(); }
  // lumière ambiante
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = amb; ctx.fillRect(0, 0, etat.W, etat.H); ctx.restore();
  if (night > 0) lights();
  // chiffres d'aperçu et de gain
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (prev) {
    prev.diff.forEach((d, i) => { if (!d || i === prev.i) return; const [x, y] = cellXY(i); pill(x, y - etat.TH * .9, (d > 0 ? '+' : '−') + Math.abs(d), d > 0 ? '#3aa76d' : '#d9534f', etat.TW * .2); });
    const [x, y] = cellXY(prev.i); pill(x, y - etat.TW * .62, (prev.tot >= 0 ? '+' : '−') + Math.abs(prev.tot), prev.tot > 0 ? '#3aa76d' : prev.tot < 0 ? '#d9534f' : '#6b7280', etat.TW * .27);
  }
  for (let k = fx.length - 1; k >= 0; k--) { const f = fx[k]; const a = (now - f.t0) / 1200; if (a > 1) { fx.splice(k, 1); continue; } const [x, y] = cellXY(f.i); ctx.globalAlpha = 1 - a * a; pill(x, y - etat.TW * .6 - a * etat.TW * .4, f.txt, f.col, etat.TW * .25); ctx.globalAlpha = 1; }
}
/** Fenêtres, halos et faisceaux des phares, la nuit. */
function lights() {
  const ctx = pen.ctx; ctx.save();
  for (const L of etat.LIGHTS) {
    if ('q' in L) { ctx.globalAlpha = L.a; ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = etat.TW * .18; poly(L.q, '#ffd98a'); }
    else if ('dot' in L) { ctx.shadowBlur = 0; ctx.globalAlpha = L.a * .55; const gr = ctx.createRadialGradient(L.dot[0], L.dot[1], 0, L.dot[0], L.dot[1], L.r); gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(L.dot[0], L.dot[1], L.r, 0, 6.3); ctx.fill(); }
    else { ctx.shadowBlur = 0; ctx.globalAlpha = L.a * .5; const [bx, by] = L.beam; const a = L.t * .9, len = etat.TW * 3.2, sp = .16; const gr = ctx.createRadialGradient(bx, by, 0, bx, by, len); gr.addColorStop(0, 'rgba(255,236,170,.9)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a - sp) * len, by + Math.sin(a - sp) * len * .5); ctx.lineTo(bx + Math.cos(a + sp) * len, by + Math.sin(a + sp) * len * .5); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- boucle ----------
let running = false;
/** Démarre la boucle d'affichage ; elle s'arrête d'elle-même quand l'onglet est caché et repart quand il revient. */
export function startLoop() {
  if (running || document.hidden) return;
  running = true; etat.last = performance.now();
  /** @param {number} now */
  const step = now => { if (document.hidden) { running = false; return; } draw(now); requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) startLoop(); });
/** Pour les tests : la boucle tourne-t-elle ? */
export const loopRunning = () => running;
