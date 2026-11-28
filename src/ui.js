// @ts-check
/** Interface en jeu : main de cartes, vœux, horloge, messages, et liaisons avec le déroulé de la partie. */
import { START, goal, T, fullScore, goalsDone } from './rules.js';
import { etat } from './state.js';
import { hooks, reroll, undo } from './game.js';
import { fit } from './render/view.js';
import { floatText, fx } from './render/frame.js';
import { icon } from './render/icons.js';
import { $, btn, esc } from './util.js';
import { ac, chime, sfx } from './audio.js';

/** Les trois cartes de la main. */
export const cards = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll('.card')]);
export function renderHand() {
  cards.forEach((b, k) => {
    const t = etat.hand[k]; b.classList.toggle('empty', !t); b.classList.toggle('sel', k === etat.sel && !!t);
    if (!t) { b.innerHTML = ''; return; }
    b.innerHTML = `<canvas></canvas><b>${T[t].nom}</b><small>${T[t].regle}</small>`;
    b.setAttribute('aria-label', T[t].nom + ' : ' + T[t].regle + (k === etat.sel ? ' (sélectionné)' : ''));
    icon(b.querySelector('canvas'), t);
  });
  btn('reroll').disabled = etat.over || etat.rerolls <= 0 || etat.G.bag.length < 1;
  $('rrInfo').textContent = `−1 h · ${etat.rerolls} restante${etat.rerolls > 1 ? 's' : ''}`;
  $('bagLeft').textContent = `${etat.G.bag.length} cartes dans le sac`;
  btn('undo').disabled = !etat.hist.length || etat.over;
}
function renderGoals() {
  const done = new Set(goalsDone(etat.G));
  $('goals').innerHTML = etat.G.goals.map(k => `<li class="${done.has(k) ? 'ok' : ''}"><i>${done.has(k) ? '✓' : ''}</i><span>${esc(goal(k).txt)}</span></li>`).join('');
}
function updateHud() {
  const h = Math.min(etat.hour, 24); $('clock').textContent = (h === 24 ? '00' : String(h).padStart(2, '0')) + ':00';
  $('score').textContent = String(fullScore(etat.G));
}
/** @type {ReturnType<typeof setTimeout>|undefined} */
let toastT;
/** Petit message en bas de l'écran. @param {string} msg */
export function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); }

btn('reroll').onclick = () => { ac(); reroll(); };
btn('undo').onclick = () => undo();

/** Écran de fin, branché par endscreen.js (évite un import circulaire). */
export const endHook = { show() {} };

// liaisons appelées par le déroulé (game.js), qui ne touche jamais au DOM
Object.assign(hooks, {
  /** @param {string} lbl */
  newGame(lbl) { $('islandName').textContent = lbl; fit(); renderGoals(); renderHand(); updateHud(); etat.dispHour = START; fx.length = 0; },
  /** @param {number} i @param {number} d @param {string[]} fresh */
  placed(i, d, fresh) {
    floatText(i, (d >= 0 ? '+' : '−') + Math.abs(d), d > 0 ? '#3aa76d' : d < 0 ? '#d9534f' : '#6b7280');
    sfx(d);
    for (const k of fresh) { toast('Vœu réalisé : ' + goal(k).txt + ' · +5'); chime(); }
    renderGoals(); renderHand(); updateHud(); etat.hover = -1;
  },
  rerolled() { sfx(0); renderHand(); updateHud(); },
  changed() { renderGoals(); renderHand(); updateHud(); },
  ended() { renderHand(); setTimeout(() => endHook.show(), 2600); },
});
