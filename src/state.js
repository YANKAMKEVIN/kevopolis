// @ts-check
/** État mutable partagé de la partie et de l'affichage. */
import { START } from './rules.js';

/** @typedef {import('./types.js').Kind} Kind */
/** @typedef {import('./types.js').Island} Island */
/** @typedef {import('./types.js').Snapshot} Snapshot */
/** @typedef {import('./types.js').Move} Move */
/** @typedef {import('./types.js').GameSpec} GameSpec */
/** Une lumière de nuit : fenêtre (q), halo (dot) ou faisceau de phare (beam).
 * @typedef {{q:number[][],a:number}|{dot:[number,number],r:number,a:number}|{beam:[number,number],a:number,t:number}} Light */
/** Fumée d'un atelier. @typedef {{i:number,age:number,dx:number}} Puff */

/** État mutable partagé. */
export const etat = {
  /** @type {Island} */ G: /** @type {any} */ (undefined),
  /** Ce qui a lancé la partie en cours. @type {GameSpec} */ spec: { seed: '', label: '', mode: 'hasard' },
  /** Les trois cartes en main (null quand le sac est vide). @type {(Kind|null)[]} */ hand: [],
  sel: 0,
  hour: START,
  rerolls: 0,
  /** @type {Snapshot[]} */ hist: [],
  over: false,
  /** Compteur de changements de l'île (caches du rendu). */ rev: 0,
  /** Meilleur coup de la partie. @type {Move|null} */ bestMove: null,
  /** 'help' quand l'accueil est rouvert pendant une partie. @type {string|null} */ mode: null,
  label: '',
  /** @type {Set<string>} */ doneBefore: new Set(),
  W: 0, H: 0, DPR: 1, TW: 0, TH: 0, OX: 0, OY: 0,
  /** @type {Light[]} */ LIGHTS: [],
  /** @type {Puff[]} */ puffs: [],
  hover: -1,
  dispHour: START,
  last: 0,
  /** @type {HTMLCanvasElement|null} */ haloC: null,
  haloKey: '',
  /** @type {AudioContext|null} */ AC: null,
  lastTouchCell: -1,
};
