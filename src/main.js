// @ts-check
/** Point d'entrée : île du jour sous l'accueil, boucle d'affichage, crochet de test. */
import { ALL_GOALS, fullScore, goalsDone, score, total } from './rules.js';
import { makeIsland } from './island.js';
import { LEVELS } from './archipel.js';
import { etat } from './state.js';
import { renderHand } from './ui.js';
import { newGame, place } from './game.js';
import { resize } from './render/view.js';
import { startLoop, loopRunning } from './render/frame.js';
import { dailySpec, drawRuleIcons, start, levelSpec } from './menu.js';
import './endscreen.js';
import './input.js';
import { loadArt } from './art.js';
import { save } from './save.js';

resize();
// île de fond sous l'accueil
newGame(dailySpec());
const drawIcons = () => { drawRuleIcons(); renderHand(); };
requestAnimationFrame(drawIcons);
startLoop();
/** Crochet pour les tests de bout en bout (lecture de l'état, aucune triche dans le jeu). */
const hook = {
  get G() { return etat.G; }, get geo() { return { OX: etat.OX, OY: etat.OY, TW: etat.TW, TH: etat.TH }; },
  score, total, fullScore, goalsDone, place, makeIsland, GOALS: ALL_GOALS, LEVELS,
  get hand() { return etat.hand; }, set sel(/** @type {number} */ v) { etat.sel = v; }, get hour() { return etat.hour; }, get spec() { return etat.spec; },
  get save() { return save; }, get running() { return loopRunning(); },
  /** @param {string} id */ playLevel(id) { start(levelSpec(id)); },
  /** @type {number|undefined} */ art: undefined,
};
/** @type {any} */ (window).__kevo = hook;
// cartes peintes : on redessine les icônes dès qu'elles arrivent
loadArt().then(n => { drawIcons(); hook.art = n; });
