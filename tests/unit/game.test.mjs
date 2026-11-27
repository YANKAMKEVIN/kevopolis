import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etat, hooks, greedyGame } from './helpers.mjs';
import { newGame, place, reroll, undo } from '../../src/game.js';
import { START, END, REROLLS, total, stars } from '../../src/rules.js';

const freeCell = () => etat.G.cells.findIndex(c => c.land && !c.type);

test('nouvelle partie : 6 h, trois cartes, deux nouvelles mains, rien de posé', () => {
  newGame('jour-2026-11-27', 'Île du 27 novembre');
  assert.equal(etat.hour, START);
  assert.equal(etat.hand.filter(Boolean).length, 3);
  assert.equal(etat.rerolls, REROLLS);
  assert.equal(etat.G.bag.length, 27);
  assert.equal(total(etat.G), 0);
  assert.equal(etat.over, false);
});

test('poser : la carte quitte la main, une nouvelle arrive du sac, l\'heure avance', () => {
  newGame('a', 'a');
  const t = etat.hand[1]; etat.sel = 1; const i = freeCell();
  let seen = null; hooks.placed = (k, d, fresh) => { seen = { k, d, fresh }; };
  place(i);
  assert.equal(etat.G.cells[i].type, t);
  assert.equal(etat.hour, START + 1);
  assert.equal(etat.G.bag.length, 26);
  assert.equal(seen.k, i);
  assert.equal(seen.d, total(etat.G));
  hooks.placed = () => {};
});

test('poser est refusé sur la mer, sur un bâtiment ou un bois', () => {
  newGame('b', 'b');
  const sea = etat.G.cells.findIndex(c => !c.land), wood = etat.G.cells.findIndex(c => c.type === 'bois');
  place(sea); place(wood);
  assert.equal(etat.hour, START);
  const i = freeCell(); place(i); place(i);
  assert.equal(etat.hour, START + 1);
});

test('nouvelle main : coûte une heure, deux fois au plus, les cartes retournent dans le sac', () => {
  newGame('c', 'c');
  const bag = etat.G.bag.length;
  reroll(); assert.equal(etat.hour, START + 1); assert.equal(etat.rerolls, REROLLS - 1); assert.equal(etat.G.bag.length, bag);
  reroll(); reroll();
  assert.equal(etat.rerolls, 0); assert.equal(etat.hour, START + 2, 'pas de troisième');
});

test('annuler défait exactement le dernier coup', () => {
  newGame('d', 'd');
  const avant = JSON.stringify({ c: etat.G.cells.map(c => c.type), h: etat.hand, b: etat.G.bag, hour: etat.hour });
  place(freeCell()); reroll();
  undo(); undo();
  assert.equal(JSON.stringify({ c: etat.G.cells.map(c => c.type), h: etat.hand, b: etat.G.bag, hour: etat.hour }), avant);
  undo(); assert.equal(etat.hour, START, 'rien à annuler : pas d\'erreur');
});

test('vœu réalisé : signalé une seule fois', () => {
  newGame('e', 'e');
  const fresh = []; hooks.placed = (_i, _d, f) => fresh.push(...f);
  greedyGame('e');
  assert.equal(new Set(fresh).size, fresh.length);
  hooks.placed = () => {};
});

test('partie complète : minuit arrive après 18 heures, on ne peut plus jouer', () => {
  let ended = 0; hooks.ended = () => { ended++; };
  const r = greedyGame('jour-2026-11-27');
  assert.ok(etat.over);
  assert.equal(etat.hour, END);
  assert.equal(r.coups, END - START);
  assert.equal(ended, 1);
  const h = etat.hour; place(freeCell()); reroll(); undo();
  assert.equal(etat.hour, h, 'partie finie : plus rien ne bouge');
  hooks.ended = () => {};
});

test('un joueur appliqué fait une vraie ville : au moins une étoile sur 20 îles', () => {
  for (let k = 0; k < 20; k++) {
    const r = greedyGame('ile-' + k);
    assert.ok(stars(r.score) >= 1, `île ${k} : ${r.score} habitants`);
  }
});
