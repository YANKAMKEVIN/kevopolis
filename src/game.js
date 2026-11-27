// @ts-check
/** Déroulé d'une partie (sans DOM) : nouvelle île, poser, changer la main, annuler, fin à minuit. Testé sous Node. */
import { END, REROLLS, START, goalsDone, makeIsland, total } from './rules.js';
import { etat } from './state.js';

export function newGame(seedStr,lbl){
  etat.G=makeIsland(seedStr);etat.label=lbl;
  etat.hand=[etat.G.bag.pop()||null,etat.G.bag.pop()||null,etat.G.bag.pop()||null];etat.sel=0;etat.hour=START;etat.rerolls=REROLLS;etat.hist=[];etat.over=false;
  etat.doneBefore=new Set();
  hooks.newGame(lbl);
}
/** Liaisons vers l'interface, branchées par ui.js (vides sous Node). */
export const hooks={/** @param {string} _lbl */ newGame(_lbl){},/** @param {number} _i @param {number} _d @param {string[]} _goals */ placed(_i,_d,_goals){},rerolled(){},changed(){},ended(){}};
export function place(i){
  if(etat.over||i<0||!etat.G.cells[i].land||etat.G.cells[i].type||!etat.hand[etat.sel])return;
  etat.hist.push({cells:etat.G.cells.map(c=>({...c})),hand:etat.hand.slice(),bag:etat.G.bag.slice(),hour:etat.hour,rerolls:etat.rerolls,sel:etat.sel});
  const before=total(etat.G);const type=etat.hand[etat.sel];
  etat.G.cells[i].type=type;etat.G.cells[i].born=performance.now();
  const d=total(etat.G)-before;
  etat.hand[etat.sel]=etat.G.bag.pop()||null;
  etat.hour++;
  if(!etat.hand[etat.sel]){const k=etat.hand.findIndex(Boolean);if(k>=0)etat.sel=k}
  const done=goalsDone(etat.G);const fresh=done.filter(k=>!etat.doneBefore.has(k));
  etat.doneBefore=new Set(done);
  hooks.placed(i,d,fresh);
  checkEnd();
}
export function reroll(){
  if(etat.over||etat.rerolls<=0)return;
  etat.hist.push({cells:etat.G.cells.map(c=>({...c})),hand:etat.hand.slice(),bag:etat.G.bag.slice(),hour:etat.hour,rerolls:etat.rerolls,sel:etat.sel});
  for(const t of etat.hand)if(t)etat.G.bag.unshift(t);
  etat.hand=[etat.G.bag.pop()||null,etat.G.bag.pop()||null,etat.G.bag.pop()||null];etat.rerolls--;etat.hour++;etat.sel=0;
  hooks.rerolled();checkEnd();
}
export function undo(){
  if(etat.over||!etat.hist.length)return;const s=/** @type {import('./state.js').Snapshot} */ (etat.hist.pop());
  etat.G.cells=s.cells.map(c=>({...c,born:0}));etat.hand=s.hand;etat.G.bag=s.bag;etat.hour=s.hour;etat.rerolls=s.rerolls;etat.sel=s.sel;
  etat.doneBefore=new Set(goalsDone(etat.G));hooks.changed();
}
function checkEnd(){
  const free=etat.G.cells.some(c=>c.land&&!c.type);
  if(etat.hour>=END||!etat.hand.some(Boolean)||!free){etat.over=true;etat.hour=Math.max(etat.hour,END);hooks.ended()}
}
