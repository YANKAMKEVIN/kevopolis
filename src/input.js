// @ts-check
/** Souris, doigt et clavier. */
import { etat } from './state.js';
import { cv, pick } from './render.js';
import { $ } from './util.js';
import { cards, renderHand } from './ui.js';
import { place, reroll, undo } from './game.js';
import { ac } from './audio.js';

cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const i=pick(e.clientX,e.clientY);etat.hover=i;cv.style.cursor=i>=0&&etat.G&&etat.G.cells[i].land&&!etat.G.cells[i].type&&!etat.over?'pointer':'default'}});
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')etat.hover=-1});
cv.addEventListener('pointerdown',e=>{
  if(!etat.G||etat.over)return;ac();const i=pick(e.clientX,e.clientY);
  if(e.pointerType==='mouse'){place(i);return}
  if(i>=0&&i===etat.lastTouchCell&&etat.hover===i){place(i);etat.lastTouchCell=-1}else{etat.hover=i;etat.lastTouchCell=i}
});
cards.forEach((b,k)=>b.addEventListener('click',()=>{ac();if(etat.hand[k]){etat.sel=k;renderHand();etat.lastTouchCell=-1;etat.hover=etat.hover}}));
addEventListener('keydown',e=>{
  // Ctrl+R (recharger), Cmd+Z… : ne pas déclencher les raccourcis du jeu, sauf annuler
  if(e.ctrlKey||e.metaKey||e.altKey){if(e.key==='z'||e.key==='Z')undo();return}
  if(!etat.G||!$('intro').classList.contains('hide'))return;
  if(['1','2','3'].includes(e.key)&&etat.hand&&etat.hand[+e.key-1]){etat.sel=+e.key-1;renderHand()}
  else if(e.key==='r'||e.key==='R')reroll();
  else if(e.key==='z'||e.key==='Z'||(e.key==='z'&&(e.metaKey||e.ctrlKey)))undo();
});
