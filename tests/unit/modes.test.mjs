// Les trois façons de jouer et le suivi de la partie (meilleur coup, compteur de changements).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etat, hooks, spec, greedyGame } from './helpers.mjs';
import { newGame, place, reroll, undo, islandFor } from '../../src/game.js';
import { dayShape } from '../../src/daily.js';
import { makeIsland } from '../../src/island.js';
import { LEVELS, levelIsland } from '../../src/archipel.js';
import { END, START, total } from '../../src/rules.js';

const freeCell = () => etat.G.cells.findIndex(c => c.land && !c.type);

test('île du jour : la forme du jour ; au hasard : la forme d\'origine ; archipel : l\'île faite à la main', () => {
  const j = islandFor({ seed: 'jour-2026-11-28', label: '', mode: 'jour' });
  assert.equal(j.shape, dayShape('2026-11-28'));
  assert.deepEqual(islandFor(spec('ile-abcde')), makeIsland('ile-abcde'));
  assert.deepEqual(islandFor({ seed: 'archipel-lagon', label: '', mode: 'archipel', level: 'lagon' }), levelIsland(LEVELS[1]));
  assert.throws(() => islandFor({ seed: 'x', label: '', mode: 'archipel', level: 'atlantide' }), /inconnue/);
});

test('chaque île de l\'archipel se joue jusqu\'à minuit', () => {
  for (const lv of LEVELS) {
    const r = greedyGame({ seed: 'archipel-' + lv.id, label: lv.nom, mode: 'archipel', level: lv.id });
    assert.ok(etat.over, lv.id); assert.equal(etat.hour, END, lv.id); assert.equal(r.coups, END - START, lv.id);
  }
});

test('île du jour : 90 jours de suite se jouent jusqu\'à minuit', () => {
  let day = new Date(2026, 0, 1);
  for (let k = 0; k < 90; k++) {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const r = greedyGame({ seed: 'jour-' + key, label: key, mode: 'jour' });
    assert.equal(r.coups, END - START, key);
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  }
});

test('meilleur coup : retenu, et défait par « annuler »', () => {
  newGame(spec('coup'));
  assert.equal(etat.bestMove, null);
  place(freeCell());
  const first = etat.bestMove;
  assert.ok(first && first.hour === START && first.d === total(etat.G));
  undo();
  assert.equal(etat.bestMove, null);
});

test('compteur de changements : avance à chaque pose, nouvelle main, annulation, nouvelle partie', () => {
  newGame(spec('rev')); let r = etat.rev;
  place(freeCell()); assert.ok(etat.rev > r); r = etat.rev;
  reroll(); assert.ok(etat.rev > r); r = etat.rev;
  undo(); assert.ok(etat.rev > r); r = etat.rev;
  place(-1); place(999); assert.equal(etat.rev, r, 'coup refusé : rien ne change');
  newGame(spec('rev2')); assert.ok(etat.rev > r);
});

test('poser hors de la carte : ignoré sans erreur', () => {
  newGame(spec('hors'));
  place(49); place(1e6); place(-3);
  assert.equal(etat.hour, START);
});

test('le sac se vide avant minuit : la partie s\'arrête quand même', () => {
  newGame(spec('vide'));
  etat.G.bag.length = 0;
  let ended = 0; hooks.ended = () => { ended++; };
  for (let k = 0; k < 3; k++) { const s = etat.hand.findIndex(Boolean); if (s < 0) break; etat.sel = s; place(freeCell()); }
  assert.ok(etat.over); assert.equal(ended, 1); assert.equal(etat.hour, END);
  hooks.ended = () => {};
});
