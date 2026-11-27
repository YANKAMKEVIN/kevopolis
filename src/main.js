// @ts-check
/** Point d'entrée : île du jour et boucle d'affichage. */
import { GOALS, fullScore, goalsDone, makeIsland, score, total } from './rules.js';
import { etat } from './state.js';
import { dayKey, fmtDay, renderHand } from './ui.js';
import { newGame, place } from './game.js';
import { frame, icon, resize } from './render.js';
import './input.js';
import { loadArt } from './art.js';

resize();
// île de fond sous l'intro
newGame('jour-'+dayKey,'Île du '+fmtDay);
const drawIcons=()=>{/** @type {NodeListOf<HTMLCanvasElement>} */ (document.querySelectorAll('#rules canvas')).forEach(c=>icon(c,c.dataset.t));renderHand()};
requestAnimationFrame(drawIcons);
// cartes peintes : on redessine les icônes dès qu'elles arrivent
loadArt().then(n=>{drawIcons();/** @type {any} */ (window).__kevo.art=n});
requestAnimationFrame(frame);
/** @type {any} */ (window).__kevo={get G(){return etat.G},get geo(){return {OX:etat.OX,OY:etat.OY,TW:etat.TW,TH:etat.TH}},score,total,fullScore,goalsDone,place,get hand(){return etat.hand},set sel(v){etat.sel=v},get hour(){return etat.hour},makeIsland,GOALS};
