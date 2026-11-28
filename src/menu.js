// @ts-check
/** Accueil, choix des îles de l'archipel et lancement des parties. */
import { T, KINDS, VERSION, randomName } from './rules.js';
import { SHAPES } from './island.js';
import { LEVELS, archipelStars, level, levelIsland, levelSeed, levelStars, unlocked } from './archipel.js';
import { dayKey, daySeed, dayShape, prevDay, streak } from './daily.js';
import { etat } from './state.js';
import { newGame } from './game.js';
import { save, persist } from './save.js';
import { icon, thumb } from './render/icons.js';
import { $, btn, esc } from './util.js';
import { ac, note } from './audio.js';

/** @typedef {import('./types.js').GameSpec} GameSpec */

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
/** La partie de l'île du jour (date locale, forme du jour). @param {Date} [d] @returns {GameSpec} */
export function dailySpec(d = new Date()) {
  const day = dayKey(d);
  return { seed: daySeed(day), label: `Île du ${fmt.format(d)} · ${SHAPES[dayShape(day)].nom}`, mode: 'jour' };
}
/** @returns {GameSpec} */
function randomSpec() { const s = randomName(); return { seed: 'ile-' + s, label: 'Île « ' + s.toUpperCase() + ' »', mode: 'hasard' }; }
/** @param {string} id @returns {GameSpec} */
export function levelSpec(id) { const lv = /** @type {import('./archipel.js').Level} */ (level(id)); return { seed: levelSeed(lv), label: lv.nom, mode: 'archipel', level: lv.id }; }

const hideAll = () => { for (const id of ['intro', 'end', 'archi']) $(id).classList.add('hide'); };
/** Lance une partie et ferme les panneaux. @param {GameSpec} spec */
export function start(spec) { etat.mode = null; newGame(spec); hideAll(); }

/** Ligne de l'accueil sur l'île du jour : forme, série en cours. */
function renderDailyInfo() {
  const day = dayKey(), s = streak(save.days, day) || streak(save.days, prevDay(day));
  const played = save.days[day] !== undefined;
  $('dailyInfo').textContent = `Aujourd'hui : ${SHAPES[dayShape(day)].nom.toLowerCase()}` + (played ? ` · ${save.days[day]} habitants` : '') + (s > 1 ? ` · série de ${s} jours` : '');
}

/** Le panneau d'où l'on a ouvert l'archipel (on y revient avec « Retour »). */
let archiFrom = 'intro';
/** Le choix des îles de l'archipel. @param {'intro'|'end'} [from] */
export function openArchipel(from = 'intro') {
  archiFrom = from;
  const st = levelStars(save.best), tot = archipelStars(save.best);
  $('archiStars').textContent = `${tot} ★ sur ${LEVELS.length * 3}`;
  $('isles').innerHTML = LEVELS.map(lv => {
    const open = unlocked(lv, save.best), best = save.best[levelSeed(lv)] || 0, n = st[lv.id];
    return `<button class="isle${open ? '' : ' locked'}" data-id="${lv.id}" ${open ? '' : 'disabled'} aria-label="${esc(lv.nom)}${open ? '' : ' (fermée)'}">
      <canvas></canvas><b>${esc(lv.nom)}</b>
      <span class="st">${[0, 1, 2].map(k => `<i class="${k < n ? '' : 'off'}">★</i>`).join('')}</span>
      <small>${open ? (best ? `Record ${best}` : esc(lv.note)) : `Encore ${lv.need - tot} ★`}</small></button>`;
  }).join('');
  $('isles').querySelectorAll('button').forEach(b => {
    const lv = /** @type {import('./archipel.js').Level} */ (level(/** @type {string} */ (b.dataset.id)));
    thumb(/** @type {HTMLCanvasElement} */ (b.querySelector('canvas')), levelIsland(lv), !unlocked(lv, save.best));
    b.addEventListener('click', () => { ac(); start(levelSpec(lv.id)); });
  });
  $('intro').classList.add('hide'); $('end').classList.add('hide'); $('archi').classList.remove('hide');
}

/** Règles illustrées de l'accueil. */
export function drawRuleIcons() {
  document.querySelectorAll('#rules canvas').forEach(c => icon(/** @type {HTMLCanvasElement} */ (c), /** @type {import('./types.js').Kind} */ (/** @type {HTMLElement} */ (c).dataset.t)));
}

$('rules').innerHTML = KINDS.map(t => `<canvas data-t="${t}"></canvas><div><b>${T[t].nom}</b> · ${T[t].regle}</div>`).join('');
$('ver').textContent = 'v' + VERSION;
const sndBtn = btn('snd');
sndBtn.style.opacity = save.muted ? '.4' : '1';
sndBtn.onclick = () => { save.muted = !save.muted; sndBtn.style.opacity = save.muted ? '.4' : '1'; persist(); if (!save.muted) note(12); };
btn('help').onclick = () => { $('intro').classList.remove('hide', 'titre'); $('playDaily').textContent = etat.G ? 'Reprendre' : 'Jouer l\'île du jour'; etat.mode = 'help'; renderDailyInfo(); };
btn('playDaily').onclick = () => { ac(); if (etat.mode === 'help' && etat.G) { $('intro').classList.add('hide'); etat.mode = null; return; } start(dailySpec()); };
btn('playRandom').onclick = () => { ac(); start(randomSpec()); };
btn('playArchipel').onclick = () => { ac(); openArchipel('intro'); };
btn('archiBack').onclick = () => { $('archi').classList.add('hide'); $(archiFrom).classList.remove('hide'); };
btn('newIsland').onclick = () => start(randomSpec());
btn('again').onclick = () => start(etat.spec);
export { renderDailyInfo };
renderDailyInfo();
