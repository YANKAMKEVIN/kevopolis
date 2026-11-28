// L'archipel : douze îles valides, jouables, calibrées, et qui s'ouvrent avec les étoiles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, levelSeed, levelIsland, levelStars, archipelStars, unlocked, nextLevel, level } from '../../src/archipel.js';
import { SHAPES } from '../../src/island.js';
import { ALL_GOALS, stars } from '../../src/rules.js';
import { greedyGame } from './helpers.mjs';

test('douze îles aux identifiants uniques, formes et vœux existants, sacs de 30 cartes', () => {
  assert.equal(LEVELS.length, 12);
  assert.equal(new Set(LEVELS.map(l => l.id)).size, 12);
  for (const lv of LEVELS) {
    assert.ok(SHAPES[lv.shape], lv.id);
    assert.equal(new Set(lv.goals).size, 3, lv.id);
    for (const gl of lv.goals) assert.ok(ALL_GOALS.some(x => x.id === gl), `${lv.id} : ${gl}`);
    if (lv.bag) assert.equal(Object.values(lv.bag).reduce((a, b) => a + b, 0), 30, lv.id);
    assert.ok(lv.stars[0] < lv.stars[1] && lv.stars[1] < lv.stars[2], lv.id);
  }
});

test('toutes les formes et tous les vœux de l\'archipel servent au moins une fois', () => {
  for (const id of Object.keys(SHAPES)) assert.ok(LEVELS.some(l => l.shape === id), id);
  for (const gl of ['veille', 'coeur', 'calme', 'lisiere', 'rue', 'ville']) assert.ok(LEVELS.some(l => l.goals.includes(gl)), gl);
});

test('ouverture progressive : les deux premières îles ouvertes, besoins croissants, la dernière atteignable sans elle', () => {
  assert.equal(LEVELS[0].need, 0); assert.equal(LEVELS[1].need, 0);
  for (let k = 1; k < LEVELS.length; k++) assert.ok(LEVELS[k].need >= LEVELS[k - 1].need);
  for (let k = 0; k < LEVELS.length; k++) assert.ok(LEVELS[k].need <= 3 * k, `${LEVELS[k].id} atteignable avec les îles d'avant`);
});

test('chaque île se génère, toujours la même, avec ses vœux, son sac et ses seuils', () => {
  for (const lv of LEVELS) {
    const g = levelIsland(lv);
    assert.deepEqual(g, levelIsland(lv));
    assert.equal(g.seedStr, levelSeed(lv)); assert.equal(g.shape, lv.shape);
    assert.deepEqual(g.goals, lv.goals); assert.deepEqual(g.stars, lv.stars);
    if (lv.bag) for (const [k, n] of Object.entries(lv.bag)) assert.equal(g.bag.filter(x => x === k).length, n, `${lv.id} ${k}`);
  }
});

test('calibrage : un joueur glouton a au moins une étoile partout, jamais les trois', () => {
  for (const lv of LEVELS) {
    const r = greedyGame({ seed: levelSeed(lv), label: lv.nom, mode: 'archipel', level: lv.id });
    const st = stars(r.score, lv.stars);
    assert.ok(st >= 1, `${lv.id} : ${r.score}`);
    assert.ok(st < 3, `${lv.id} : ${r.score} — trois étoiles sans effort`);
  }
});

test('étoiles et ouverture d\'après les records', () => {
  const best = {};
  assert.equal(archipelStars(best), 0);
  assert.ok(unlocked(LEVELS[1], best)); assert.ok(!unlocked(LEVELS[2], best));
  best[levelSeed(LEVELS[0])] = LEVELS[0].stars[1]; // deux étoiles
  assert.equal(levelStars(best)[LEVELS[0].id], 2);
  assert.equal(archipelStars(best), 2);
  assert.ok(unlocked(LEVELS[2], best));
  assert.equal(nextLevel(LEVELS[1].id, best)?.id, LEVELS[2].id);
  assert.equal(nextLevel(LEVELS[2].id, best), null, 'la quatrième demande plus d\'étoiles');
  assert.equal(nextLevel(LEVELS[11].id, best), null, 'pas d\'île après la dernière');
  best['ile-abcde'] = 999; // les autres îles ne comptent pas
  assert.equal(archipelStars(best), 2);
});

test('level : par identifiant, undefined si inconnu', () => {
  assert.equal(level('lagon')?.nom, 'Le Lagon');
  assert.equal(level('nulle-part'), undefined);
});
