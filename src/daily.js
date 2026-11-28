// @ts-check
/** Le défi du jour (sans DOM) : date locale, forme de l'île du jour, série de jours joués. */
import { hash } from './rules.js';
import { SHAPE_IDS } from './island.js';

/** Jour local au format AAAA-MM-JJ. (Avant : la date UTC, si bien qu'entre minuit et 1 h à Paris
 * on jouait l'île de la veille sous le nom du jour.) @param {Date} [d] */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Graine de l'île du jour. @param {string} day */
export const daySeed = day => 'jour-' + day;
/** Forme de l'île du jour : la même pour tout le monde, différente d'un jour à l'autre. @param {string} day */
export const dayShape = day => SHAPE_IDS[hash('forme-' + day) % SHAPE_IDS.length];
/** Jours écoulés entre deux dates AAAA-MM-JJ. @param {string} a @param {string} b */
export function daysBetween(a, b) {
  const p = (/** @type {string} */ s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 864e5);
}
/** La veille d'un jour AAAA-MM-JJ. @param {string} day */
export function prevDay(day) {
  const [y, m, d] = day.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.toISOString().slice(0, 10);
}
/** Nombre de jours d'affilée joués, en finissant par `day` (0 si `day` n'a pas été joué).
 * @param {Record<string,number>} days @param {string} day */
export function streak(days, day) {
  let n = 0, k = day;
  while (days[k] !== undefined) { n++; k = prevDay(k); }
  return n;
}
/** Les `n` derniers jours jusqu'à `day` inclus, du plus ancien au plus récent, avec leur score (ou null).
 * @param {Record<string,number>} days @param {string} day @param {number} [n] @returns {{day:string,score:number|null}[]} */
export function lastDays(days, day, n = 7) {
  const out = []; let k = day;
  for (let i = 0; i < n; i++) { out.unshift({ day: k, score: days[k] ?? null }); k = prevDay(k); }
  return out;
}
