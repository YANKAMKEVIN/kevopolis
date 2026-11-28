// @ts-check
/** Écran de fin : score, étoiles et barre des seuils, bilan par bâtiment, vœux, meilleur coup,
 * record de l'île, semaine de l'île du jour, île suivante de l'archipel. */
import { T } from './rules.js';
import { etat } from './state.js';
import { recordScore, save } from './save.js';
import { summarize, barPos, shareText } from './stats.js';
import { dayKey, lastDays, streak } from './daily.js';
import { archipelStars, nextLevel, LEVELS } from './archipel.js';
import { icon } from './render/icons.js';
import { endHook, toast } from './ui.js';
import { openArchipel, start, levelSpec, renderDailyInfo } from './menu.js';
import { $, btn, esc } from './util.js';
import { chord } from './audio.js';

const MSG = ['Une ville encore timide', 'Une jolie ville', 'Une ville rayonnante', 'Une ville légendaire'];
const WD = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });

/** Affiche l'écran de fin et enregistre la partie. */
export function showEnd() {
  const g = etat.G, sum = summarize(g), s = sum.score, st = sum.stars, spec = etat.spec;
  const day = spec.mode === 'jour' ? spec.seed.replace(/^jour-/, '') : null;
  const starsBefore = archipelStars(save.best);
  const best = recordScore(g.seedStr, s, day);
  $('endTitle').textContent = spec.mode === 'archipel' ? `Minuit · ${spec.label}` : 'Minuit à Kevopolis';
  $('endScore').textContent = String(s);
  $('endDetail').textContent = `habitants · ${sum.base} par les bâtiments, ${sum.bonus} par ${sum.bonus / 5} vœu${sum.bonus > 5 ? 'x' : ''}`;
  $('endStars').innerHTML = [0, 1, 2].map(k => `<span class="${k < st ? '' : 'off'}">★</span>`).join('');
  // barre des seuils
  $('endFill').style.width = (barPos(s, g.stars) * 100).toFixed(1) + '%';
  $('endTicks').innerHTML = g.stars.map((v, k) => `<span style="left:${(barPos(v, g.stars) * 100).toFixed(1)}%" class="${k < st ? 'on' : ''}">${v}</span>`).join('');
  $('endNext').textContent = sum.next === null ? 'Les trois étoiles !' : `Encore ${sum.next} habitant${sum.next > 1 ? 's' : ''} pour l'étoile suivante.`;
  $('endMsg').textContent = `${MSG[st]} : ${sum.lit} bâtiments sur ${sum.built} brillent dans la nuit.`;
  // bilan par bâtiment
  $('endBreak').innerHTML = sum.byType.map(b => `<li><canvas data-t="${b.type}"></canvas><span>${b.n} × ${T[b.type].nom.toLowerCase()}</span><b class="${b.pts < 0 ? 'neg' : ''}">${b.pts > 0 ? '+' : b.pts < 0 ? '−' : ''}${Math.abs(b.pts)}</b></li>`).join('');
  $('endBreak').querySelectorAll('canvas').forEach(c => icon(/** @type {HTMLCanvasElement} */ (c), /** @type {import('./types.js').Kind} */ (/** @type {HTMLElement} */ (c).dataset.t)));
  $('endWishes').innerHTML = sum.wishes.map(w => `<li class="${w.done ? 'ok' : ''}"><i>${w.done ? '✓' : ''}</i><span>${esc(w.txt)}</span><b>${w.done ? '+5' : ''}</b></li>`).join('');
  const bm = etat.bestMove;
  $('endMove').textContent = bm && bm.d > 0 ? `Meilleur coup : ${T[bm.type].nom.toLowerCase()} à ${bm.hour} h, +${bm.d}.` : '';
  $('endBest').textContent = s > best && best > 0 ? `Nouveau record sur cette île (ancien : ${best}).` : best > 0 ? `Record sur cette île : ${Math.max(best, s)}.` : 'Premier score enregistré sur cette île.';
  // île du jour : la semaine et la série
  const week = $('endWeek');
  week.classList.toggle('hide', !day);
  if (day) {
    const today = dayKey();
    week.innerHTML = lastDays(save.days, day).map(x => {
      const [y, m, d] = x.day.split('-').map(Number);
      return `<span class="${x.score === null ? 'off' : ''}${x.day === day ? ' now' : ''}" title="${x.day}"><small>${WD.format(new Date(y, m - 1, d))}</small>${x.score ?? '·'}</span>`;
    }).join('');
    const n = streak(save.days, day);
    $('endStreak').textContent = n > 1 ? `Série : ${n} jours d'affilée sur l'île du jour.` : day === today ? 'Reviens demain pour une nouvelle île.' : '';
  } else $('endStreak').textContent = '';
  // archipel : île suivante, îles nouvellement ouvertes
  const nx = spec.mode === 'archipel' && spec.level ? nextLevel(spec.level, save.best) : null;
  const opened = LEVELS.filter(l => l.need > starsBefore && l.need <= archipelStars(save.best));
  const nextB = btn('next');
  nextB.classList.toggle('hide', !nx);
  if (nx) { nextB.textContent = `Île suivante : ${nx.nom}`; nextB.onclick = () => start(levelSpec(nx.id)); }
  btn('toArchi').classList.toggle('hide', spec.mode !== 'archipel');
  if (opened.length) setTimeout(() => toast(`Nouvelle île ouverte : ${opened.map(l => l.nom).join(', ')}`), 900);
  $('end').classList.remove('hide'); chord(); renderDailyInfo();
  btn('copy').onclick = () => {
    const txt = shareText(etat.label, s, st);
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast('Score copié'), () => toast(txt)); else toast(txt);
  };
}
btn('toArchi').onclick = () => openArchipel('end');
endHook.show = showEnd;
