// @ts-check
/** Interface : main de cartes, vœux, heure, fin de partie, écran d'accueil, boutons. */
import { save, persist, recordScore } from './save.js';
import { START, goal, T, VERSION, fullScore, goalsDone, randomName, score, stars, total } from './rules.js';
import { etat } from './state.js';
import { hooks, newGame, reroll, undo } from './game.js';
import { fit, floatText, fx, icon } from './render.js';
import { $ } from './util.js';
import { ac, chime, chord, note, sfx } from './audio.js';

const today=new Date();
export const dayKey=today.toISOString().slice(0,10);
export const cards=[...document.querySelectorAll('.card')];
export function renderHand(){
  cards.forEach((b,k)=>{
    const t=etat.hand[k];b.classList.toggle('empty',!t);b.classList.toggle('sel',k===etat.sel&&!!t);
    if(!t){b.innerHTML='';return}
    b.innerHTML=`<canvas></canvas><b>${T[t].nom}</b><small>${T[t].regle}</small>`;
    b.setAttribute('aria-label',T[t].nom+' : '+T[t].regle+(k===etat.sel?' (sélectionné)':''));
    icon(b.querySelector('canvas'),t);
  });
  $('reroll').disabled=etat.over||etat.rerolls<=0||etat.G.bag.length<1;
  $('rrInfo').textContent=`−1 h · ${etat.rerolls} restante${etat.rerolls>1?'s':''}`;
  $('bagLeft').textContent=`${etat.G.bag.length} cartes dans le sac`;
  $('undo').disabled=!etat.hist.length||etat.over;
}
function renderGoals(){
  const done=new Set(goalsDone(etat.G));
  $('goals').innerHTML=etat.G.goals.map(k=>`<li class="${done.has(k)?'ok':''}"><i>${done.has(k)?'✓':''}</i><span>${goal(k).txt}</span></li>`).join('');
}
function updateHud(){
  const h=Math.min(etat.hour,24);$('clock').textContent=(h===24?'00':String(h).padStart(2,'0'))+':00';
  $('score').textContent=fullScore(etat.G);
}
/** @type {ReturnType<typeof setTimeout>|undefined} */
let toastT;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1800)}
function showEnd(){
  const base=total(etat.G),gd=goalsDone(etat.G).length,s=base+5*gd,st=stars(s);
  const best=recordScore(etat.G.seedStr,s);
  $('endTitle').textContent='Minuit à Kevopolis';
  $('endScore').textContent=s;
  $('endDetail').textContent=`habitants · ${base} par les bâtiments, ${5*gd} par ${gd} vœu${gd>1?'x':''}`;
  $('endStars').innerHTML=[0,1,2].map(k=>`<span class="${k<st?'':'off'}">★</span>`).join('');
  const lit=etat.G.cells.filter((c,i)=>c.type&&c.type!=='bois'&&score(etat.G,i)>0).length,all=etat.G.cells.filter(c=>c.type&&c.type!=='bois').length;
  $('endMsg').textContent=[`Une ville encore timide : ${lit} bâtiments sur ${all} brillent dans la nuit.`,`Une jolie ville : ${lit} bâtiments sur ${all} brillent dans la nuit.`,`Une ville rayonnante : ${lit} bâtiments sur ${all} brillent dans la nuit.`,`Une ville légendaire : ${lit} bâtiments sur ${all} brillent dans la nuit.`][st];
  $('endBest').textContent=s>best&&best>0?`Nouveau record sur cette île (ancien : ${best}).`:best>0?`Record sur cette île : ${Math.max(best,s)}.`:'Premier score enregistré sur cette île.';
  $('end').classList.remove('hide');chord();
  $('copy').onclick=()=>{const txt=`Kevopolis · ${etat.label} · ${s} habitants ${'★'.repeat(st)}${'☆'.repeat(3-st)}`;navigator.clipboard?.writeText(txt).then(()=>toast('Score copié'),()=>toast(txt))};
}
$('snd').style.opacity=save.muted?.4:1;
$('reroll').onclick=()=>{ac();reroll()};
$('undo').onclick=undo;
$('snd').onclick=()=>{save.muted=!save.muted;$('snd').style.opacity=save.muted?.4:1;persist();if(!save.muted)note(12)};
$('help').onclick=()=>{$('intro').classList.remove('hide');$('playDaily').textContent=etat.G?'Reprendre':'Jouer l\'île du jour';etat.mode='help'};
export const fmtDay=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long'}).format(today);
function startDaily(){newGame('jour-'+dayKey,'Île du '+fmtDay);$('intro').classList.add('hide');$('end').classList.add('hide')}
function startRandom(){const s=randomName();newGame('ile-'+s,'Île « '+s.toUpperCase()+' »');$('intro').classList.add('hide');$('end').classList.add('hide')}
$('playDaily').onclick=()=>{ac();if(etat.mode==='help'&&etat.G){$('intro').classList.add('hide');etat.mode=null;return}startDaily()};
$('playRandom').onclick=()=>{ac();etat.mode=null;startRandom()};
$('again').onclick=()=>{const s=etat.G.seedStr,l=etat.label;newGame(s,l);$('end').classList.add('hide')};
$('newIsland').onclick=startRandom;
// règles illustrées dans l'intro
$('rules').innerHTML=['maison','parc','boutique','atelier','place','phare'].map(t=>`<canvas data-t="${t}"></canvas><div><b>${T[t].nom}</b> · ${T[t].regle}</div>`).join('');

// liaisons appelées par les règles (game.js), qui ne touchent jamais au DOM
Object.assign(hooks, {
  newGame(lbl) { $('islandName').textContent = lbl; fit(); renderGoals(); renderHand(); updateHud(); etat.dispHour = START; fx.length = 0; },
  placed(i, d, fresh) {
    floatText(i, (d >= 0 ? '+' : '−') + Math.abs(d), d > 0 ? '#3aa76d' : d < 0 ? '#d9534f' : '#6b7280');
    sfx(d);
    for (const k of fresh) { toast('Vœu réalisé : ' + goal(k).txt + ' · +5'); chime(); }
    renderGoals(); renderHand(); updateHud(); etat.hover = -1;
  },
  rerolled() { sfx(0); renderHand(); updateHud(); },
  changed() { renderGoals(); renderHand(); updateHud(); },
  ended() { renderHand(); setTimeout(showEnd, 2600); },
});
$('ver').textContent = 'v' + VERSION;
