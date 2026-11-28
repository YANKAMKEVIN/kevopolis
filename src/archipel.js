// @ts-check
/** L'archipel : douze îles faites à la main (forme, graine, vœux, sac, seuils d'étoiles),
 * qui se débloquent avec les étoiles gagnées. Sans DOM. */
import { makeIsland } from './island.js';
import { stars } from './rules.js';

/** @typedef {import('./types.js').Kind} Kind */
/** @typedef {import('./types.js').Stars} Stars */
/** @typedef {import('./types.js').Island} Island */
/** Une île de l'archipel. `need` : étoiles à réunir sur tout l'archipel pour l'ouvrir.
 * @typedef {{id:string,nom:string,shape:string,goals:string[],bag?:Readonly<Record<Kind,number>>,stars:Stars,need:number,note:string}} Level */

/** Les îles, de la plus douce à la plus exigeante. Seuils calibrés par `node tools/calibrer.mjs`. @type {readonly Level[]} */
export const LEVELS = [
  { id: 'aube', nom: 'Île de l\'Aube', shape: 'ronde', goals: ['phare', 'quart', 'ronde'], stars: [36, 47, 58], need: 0, note: 'Pour se faire la main.' },
  { id: 'lagon', nom: 'Le Lagon', shape: 'atoll', goals: ['vert', 'lisiere', 'quart'], stars: [46, 60, 73], need: 0, note: 'Le lagon au centre compte comme la mer.' },
  { id: 'marche', nom: 'Port-Marché', shape: 'croissant', goals: ['marche', 'rue', 'troc'], bag: { maison: 9, parc: 3, boutique: 8, atelier: 6, place: 2, phare: 2 }, stars: [37, 47, 57], need: 1, note: 'Un sac riche en boutiques.' },
  { id: 'phares', nom: 'Cap des Phares', shape: 'longue', goals: ['veille', 'phare', 'vert'], bag: { maison: 9, parc: 5, boutique: 4, atelier: 4, place: 3, phare: 5 }, stars: [50, 64, 77], need: 3, note: 'Cinq phares dans le sac.' },
  { id: 'forge', nom: 'La Forge', shape: 'jumelles', goals: ['usine', 'calme', 'troc'], bag: { maison: 8, parc: 4, boutique: 5, atelier: 9, place: 2, phare: 2 }, stars: [47, 59, 71], need: 5, note: 'Les ateliers d\'un côté, les maisons de l\'autre.' },
  { id: 'trio', nom: 'Les Trois Sœurs', shape: 'ilots', goals: ['phare', 'carre', 'quart'], stars: [41, 51, 62], need: 7, note: 'Trois îlots que rien ne relie.' },
  { id: 'agora', nom: 'Agora', shape: 'ronde', goals: ['coeur', 'carre', 'marche'], bag: { maison: 9, parc: 4, boutique: 5, atelier: 4, place: 6, phare: 2 }, stars: [44, 55, 67], need: 9, note: 'Six places à remplir de vie.' },
  { id: 'bosquets', nom: 'Les Bosquets', shape: 'croissant', goals: ['lisiere', 'ronde', 'vert'], bag: { maison: 10, parc: 8, boutique: 4, atelier: 3, place: 3, phare: 2 }, stars: [43, 54, 66], need: 12, note: 'Huit parcs, des bois, la mer.' },
  { id: 'cite', nom: 'La Cité', shape: 'jumelles', goals: ['ville', 'rue', 'coeur'], bag: { maison: 13, parc: 4, boutique: 5, atelier: 3, place: 3, phare: 2 }, stars: [52, 66, 80], need: 15, note: 'Une vraie ville : huit maisons d\'un bloc.' },
  { id: 'recif', nom: 'Le Récif', shape: 'atoll', goals: ['veille', 'calme', 'usine'], bag: { maison: 8, parc: 4, boutique: 5, atelier: 7, place: 2, phare: 4 }, stars: [48, 61, 73], need: 18, note: 'Les phares veillent sur le lagon.' },
  { id: 'detroit', nom: 'Le Détroit', shape: 'ilots', goals: ['quart', 'rue', 'veille'], bag: { maison: 10, parc: 4, boutique: 6, atelier: 3, place: 3, phare: 4 }, stars: [47, 59, 71], need: 21, note: 'Chaque îlot sa ville.' },
  { id: 'couronne', nom: 'La Couronne', shape: 'longue', goals: ['ville', 'coeur', 'veille'], bag: { maison: 13, parc: 4, boutique: 4, atelier: 2, place: 4, phare: 3 }, stars: [58, 72, 86], need: 24, note: 'La dernière île, la plus exigeante.' },
];

/** Graine (et clé de record) d'une île de l'archipel. @param {Level} lv */
export const levelSeed = lv => 'archipel-' + lv.id;
/** L'île de l'archipel d'identifiant id, ou undefined. @param {string} id */
export const level = id => LEVELS.find(l => l.id === id);
/** Fabrique l'île d'un niveau. @param {Level} lv @returns {Island} */
export function levelIsland(lv) {
  return makeIsland(levelSeed(lv), { shape: lv.shape, goals: lv.goals, ...(lv.bag ? { bag: lv.bag } : {}), stars: lv.stars });
}
/** Étoiles gagnées sur chaque île d'après les records. @param {Record<string,number>} best @returns {Record<string,number>} */
export function levelStars(best) {
  /** @type {Record<string,number>} */ const out = {};
  for (const lv of LEVELS) out[lv.id] = stars(best[levelSeed(lv)] || 0, lv.stars);
  return out;
}
/** Total des étoiles de l'archipel. @param {Record<string,number>} best */
export const archipelStars = best => Object.values(levelStars(best)).reduce((a, b) => a + b, 0);
/** L'île est-elle ouverte ? @param {Level} lv @param {Record<string,number>} best */
export const unlocked = (lv, best) => archipelStars(best) >= lv.need;
/** L'île suivante dans l'ordre, ouverte, ou null. @param {string} id @param {Record<string,number>} best */
export function nextLevel(id, best) {
  const k = LEVELS.findIndex(l => l.id === id), nx = LEVELS[k + 1];
  return nx && unlocked(nx, best) ? nx : null;
}
