// @ts-check
/** Bilan d'une partie pour l'écran de fin (sans DOM) : points par bâtiment, vœux, étoiles, lumières. */
import { KINDS, goal, goalsDone, score, stars, total } from './rules.js';

/** @typedef {import('./types.js').Kind} Kind */
/** @typedef {import('./types.js').Island} Island */
/** Le bilan d'une île.
 * @typedef {{base:number,bonus:number,score:number,stars:number,
 *   byType:{type:Kind,n:number,pts:number}[],
 *   wishes:{id:string,txt:string,done:boolean}[],
 *   lit:number,built:number,next:number|null}} Summary */

/** Bilan de l'île : `next` est le nombre d'habitants qui manquaient pour l'étoile suivante (null à 3 étoiles).
 * @param {Island} g @returns {Summary} */
export function summarize(g) {
  const base = total(g), done = new Set(goalsDone(g)), bonus = 5 * done.size, s = base + bonus, st = stars(s, g.stars);
  const byType = KINDS.map(type => {
    let n = 0, pts = 0;
    g.cells.forEach((c, i) => { if (c.type === type) { n++; pts += score(g, i); } });
    return { type, n, pts };
  }).filter(x => x.n > 0);
  let lit = 0, built = 0;
  g.cells.forEach((c, i) => { if (c.type && c.type !== 'bois') { built++; if (score(g, i) > 0) lit++; } });
  return {
    base, bonus, score: s, stars: st, byType, lit, built,
    wishes: g.goals.map(id => ({ id, txt: goal(id).txt, done: done.has(id) })),
    next: st < 3 ? g.stars[/** @type {0|1|2} */ (st)] - s : null,
  };
}

/** Position (0 à 1) d'un score sur la barre des étoiles, la troisième étoile aux 9/10 de la barre.
 * @param {number} s @param {import('./types.js').Stars} th */
export function barPos(s, th) { return Math.max(0, Math.min(1, s / (th[2] / .9))); }

/** Texte à partager. @param {string} label @param {number} s @param {number} st */
export function shareText(label, s, st) { return `Kevopolis · ${label} · ${s} habitants ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`; }
