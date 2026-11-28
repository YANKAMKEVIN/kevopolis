// Bilan de l'écran de fin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, barPos, shareText } from '../../src/stats.js';
import { total, fullScore } from '../../src/rules.js';
import { island } from './helpers.mjs';

test('bilan : points par bâtiment, vœux, bâtiments allumés, étoile suivante', () => {
  const g = island(['mmmmm', 'f..a.', 'ooooo'], ['quart', 'phare', 'usine']);
  const s = summarize(g);
  assert.equal(s.base, total(g)); assert.equal(s.score, fullScore(g)); assert.equal(s.bonus, 10);
  assert.deepEqual(s.byType.map(b => b.type), ['maison', 'atelier', 'phare'], 'dans l\'ordre des règles, sans les absents');
  const m = s.byType.find(b => b.type === 'maison');
  assert.equal(m.n, 5); assert.equal(m.pts, 2 + 3 + 3 + 3 + 2);
  assert.equal(s.byType.find(b => b.type === 'atelier').pts, 3 - 2, 'une maison au-dessus');
  assert.deepEqual(s.wishes.map(w => w.done), [true, true, false]);
  assert.equal(s.built, 7); assert.equal(s.lit, 7);
  assert.equal(s.stars, 0); assert.equal(s.next, 40 - s.score);
});

test('bilan : un bâtiment qui ne rapporte rien reste éteint ; trois étoiles : plus d\'étoile suivante', () => {
  const g = island(['ooooooo', 'ooooooo', 'ooofooo', 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo']);
  const s = summarize(g);
  assert.equal(s.built, 1); assert.equal(s.lit, 0);
  g.stars = [1, 2, 3]; g.cells[0].type = 'phare';
  assert.equal(summarize(g).next, null);
});

test('barre des étoiles : la troisième aux 9/10, bornée entre 0 et 1', () => {
  assert.equal(barPos(0, [40, 54, 66]), 0);
  assert.ok(Math.abs(barPos(66, [40, 54, 66]) - .9) < 1e-9);
  assert.equal(barPos(500, [40, 54, 66]), 1);
});

test('texte à partager', () => {
  assert.equal(shareText('Le Lagon', 61, 2), 'Kevopolis · Le Lagon · 61 habitants ★★☆');
});
