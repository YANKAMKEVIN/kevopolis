// @ts-check
/** État mutable partagé de la partie et de l'affichage. */
import { START } from './rules.js';

/** Une case de l'île : terre ou mer, bâtiment posé (null si vide), heure de pose (animation).
 * @typedef {{land:boolean,type:string|null,born:number}} Cell */
/** L'île en cours : 7×7 cases, graine, sac de cartes restant, trois vœux.
 * @typedef {{cells:Cell[],seedStr:string,bag:string[],goals:string[]}} Island */
/** Ce qu'il faut pour annuler un coup.
 * @typedef {{cells:Cell[],hand:(string|null)[],bag:string[],hour:number,rerolls:number,sel:number}} Snapshot */

/** État mutable partagé (anciennes variables globales). */
export const etat = {
  /** @type {Island} */ G: /** @type {any} */ (undefined),
  /** Les trois cartes en main (null quand le sac est vide). @type {(string|null)[]} */ hand: [],
  sel: 0,
  hour: START,
  rerolls: 0,
  /** @type {Snapshot[]} */ hist: [],
  over: false,
  /** 'help' quand l'accueil est rouvert pendant une partie. @type {string|null} */ mode: null,
  label: '',
  /** @type {Set<string>} */ doneBefore: new Set(),
  W: 0,
  H: 0,
  DPR: 1,
  TW: 0,
  TH: 0,
  OX: 0,
  OY: 0,
  /** @type {any[]} */ LIGHTS: [],
  /** @type {any[]} */ puffs: [],
  hover: -1,
  dispHour: START,
  last: performance.now(),
  /** @type {HTMLCanvasElement|null} */ haloC: null,
  haloKey: '',
  /** @type {AudioContext|null} */ AC: null,
  lastTouchCell: -1,
};

