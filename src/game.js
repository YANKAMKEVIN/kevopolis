// @ts-check
/** Déroulé d'une partie (sans DOM) : nouvelle île, poser, changer la main, annuler, fin à minuit. Testé sous Node. */
import { END, REROLLS, START, goalsDone, total } from './rules.js';
import { makeIsland } from './island.js';
import { level, levelIsland } from './archipel.js';
import { dayShape } from './daily.js';
import { etat } from './state.js';

/** @typedef {import('./types.js').GameSpec} GameSpec */
/** @typedef {import('./types.js').Island} Island */

/** L'île d'une partie : archipel (île faite à la main), île du jour (forme du jour) ou au hasard (forme d'origine).
 * @param {GameSpec} spec @returns {Island} */
export function islandFor(spec) {
  if (spec.mode === 'archipel') {
    const lv = level(spec.level || '');
    if (!lv) throw new Error('île de l\'archipel inconnue : ' + spec.level);
    return levelIsland(lv);
  }
  if (spec.mode === 'jour') return makeIsland(spec.seed, { shape: dayShape(spec.seed.replace(/^jour-/, '')) });
  return makeIsland(spec.seed);
}

/** Liaisons vers l'interface, branchées par ui.js (vides sous Node). */
export const hooks = {
  /** @param {string} _lbl */ newGame(_lbl) {},
  /** @param {number} _i @param {number} _d @param {string[]} _goals */ placed(_i, _d, _goals) {},
  rerolled() {}, changed() {}, ended() {},
};

/** Instant présent (animation des bâtiments). */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const snapshot = () => ({ cells: etat.G.cells.map(c => ({ ...c })), hand: etat.hand.slice(), bag: etat.G.bag.slice(), hour: etat.hour, rerolls: etat.rerolls, sel: etat.sel, bestMove: etat.bestMove });
const draw = () => etat.G.bag.pop() || null;

/** Lance une partie. @param {GameSpec} spec */
export function newGame(spec) {
  etat.G = islandFor(spec); etat.spec = spec; etat.label = spec.label;
  etat.hand = [draw(), draw(), draw()]; etat.sel = 0; etat.hour = START; etat.rerolls = REROLLS; etat.hist = []; etat.over = false;
  etat.doneBefore = new Set(); etat.bestMove = null; etat.rev++;
  hooks.newGame(spec.label);
}
/** Pose la carte choisie sur la case i (ignoré si impossible). @param {number} i */
export function place(i) {
  const type = etat.hand[etat.sel];
  if (etat.over || i < 0 || i >= etat.G.cells.length || !etat.G.cells[i].land || etat.G.cells[i].type || !type) return;
  etat.hist.push(snapshot());
  const before = total(etat.G);
  etat.G.cells[i].type = type; etat.G.cells[i].born = now();
  const d = total(etat.G) - before;
  if (!etat.bestMove || d > etat.bestMove.d) etat.bestMove = { type, d, hour: etat.hour };
  etat.hand[etat.sel] = draw();
  etat.hour++; etat.rev++;
  if (!etat.hand[etat.sel]) { const k = etat.hand.findIndex(Boolean); if (k >= 0) etat.sel = k; }
  const done = goalsDone(etat.G), fresh = done.filter(k => !etat.doneBefore.has(k));
  etat.doneBefore = new Set(done);
  hooks.placed(i, d, fresh);
  checkEnd();
}
/** Nouvelle main : les trois cartes retournent sous le sac, coûte une heure. */
export function reroll() {
  if (etat.over || etat.rerolls <= 0) return;
  etat.hist.push(snapshot());
  for (const t of etat.hand) if (t) etat.G.bag.unshift(t);
  etat.hand = [draw(), draw(), draw()]; etat.rerolls--; etat.hour++; etat.sel = 0; etat.rev++;
  hooks.rerolled(); checkEnd();
}
/** Annule le dernier coup (pose ou nouvelle main). */
export function undo() {
  if (etat.over || !etat.hist.length) return;
  const s = /** @type {import('./types.js').Snapshot} */ (etat.hist.pop());
  etat.G.cells = s.cells.map(c => ({ ...c, born: 0 })); etat.hand = s.hand; etat.G.bag = s.bag; etat.hour = s.hour; etat.rerolls = s.rerolls; etat.sel = s.sel; etat.bestMove = s.bestMove;
  etat.doneBefore = new Set(goalsDone(etat.G)); etat.rev++; hooks.changed();
}
/** Minuit, plus de carte ou plus de place : la partie est finie. */
function checkEnd() {
  const free = etat.G.cells.some(c => c.land && !c.type);
  if (etat.hour >= END || !etat.hand.some(Boolean) || !free) { etat.over = true; etat.hour = Math.max(etat.hour, END); hooks.ended(); }
}
