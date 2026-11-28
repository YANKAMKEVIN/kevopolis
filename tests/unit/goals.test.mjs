// Les vœux : chacun reconnu quand il est réalisé, refusé juste en dessous du seuil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, EXTRA_GOALS, ALL_GOALS, goal, goalsDone, fullScore, total } from '../../src/rules.js';
import { island } from './helpers.mjs';

const ok = (id, rows) => assert.ok(goal(id).test(island(rows, [id])), `${id} devrait être réalisé`);
const ko = (id, rows) => assert.ok(!goal(id).test(island(rows, [id])), `${id} ne devrait pas être réalisé`);

test('identifiants uniques ; huit vœux classiques, six de l\'archipel', () => {
  assert.equal(GOALS.length, 8); assert.equal(EXTRA_GOALS.length, 6);
  assert.equal(new Set(ALL_GOALS.map(g => g.id)).size, 14);
  assert.throws(() => goal('inconnu'), /vœu inconnu/);
});

test('aucun vœu n\'est réalisé sur une île vide', () => {
  for (const g of ALL_GOALS) assert.ok(!g.test(island(['ooooooo', 'ooooooo'], [g.id])), g.id);
});

test('vœux classiques : juste au seuil, juste en dessous', () => {
  ok('ronde', ['.m.', 'mpm']); ko('ronde', ['.m.', 'mpo']);
  ok('phare', ['f']); ko('phare', ['ooooooo', 'ooooooo', 'ooofooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo']);
  ok('marche', ['b.b.b.b']); ko('marche', ['b.b.b..']);
  ok('quart', ['mmm', '.mm']); ko('quart', ['mmm', '..', 'mm']);
  ok('usine', ['.aa']); ko('usine', ['a.a']);
  ok('carre', ['msp', '.a.']); ko('carre', ['msm', '.a.']);
  ok('troc', ['aba']); ko('troc', ['abm']);
  ok('vert', ['p.p.p']); ko('vert', ['p.p', '', '', 'ooooooo', 'oooopoo', 'ooooooo', 'ooooooo']);
});

test('vœux de l\'archipel : juste au seuil, juste en dessous', () => {
  ok('veille', ['f.....f']); ko('veille', ['f', '', '', 'ooooooo', 'ooofooo', 'ooooooo', 'ooooooo']);
  ok('coeur', ['ooooooo', 'oomoooo', 'opsbooo', 'ooaoooo']); ko('coeur', ['ooooooo', 'oomoooo', 'opsbooo', 'ootoooo']);
  ok('calme', ['a.a.a']); ko('calme', ['a.a.am']);
  ok('lisiere', ['pt']); ko('lisiere', ['p.t']);
  ok('rue', ['bbb']); ko('rue', ['bb.b']);
  ok('ville', ['mmmm', 'mmmm']); ko('ville', ['mmmm', 'mmm.']);
});

test('place sur le bord de la carte : trois voisins seulement, le vœu « cœur » est impossible', () => {
  ko('coeur', ['msb', '.a.']);
});

test('goalsDone et fullScore : 5 habitants par vœu réalisé, seulement les vœux de l\'île', () => {
  const g = island(['mmmmm', 'f....'], ['quart', 'phare', 'usine']);
  assert.deepEqual(goalsDone(g).sort(), ['phare', 'quart']);
  assert.equal(fullScore(g), total(g) + 10);
  const h = island(['mmmmm', 'f....'], ['usine']);
  assert.equal(fullScore(h), total(h));
});
