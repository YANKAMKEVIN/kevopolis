import { test } from 'node:test';
import assert from 'node:assert/strict';
import { N, BAG, GOALS, score, total, fullScore, goalsDone, makeIsland, stars, nb, coast, biggest, randomName } from '../../src/rules.js';
import { island, at } from './helpers.mjs';

test('voisins : seulement les côtés qui se touchent, jamais hors de l\'île', () => {
  assert.deepEqual(nb(at(0, 0)).sort((a, b) => a - b), [1, N]);
  assert.equal(nb(at(3, 3)).length, 4);
  assert.equal(nb(at(N - 1, N - 1)).length, 2);
  assert.ok(!nb(at(N - 1, 2)).includes(at(0, 3)), 'pas de passage d\'un bord à l\'autre');
});

test('bord de l\'eau : case du bord de la carte ou voisine de la mer', () => {
  const g = island(['.......', '.ooooo.', '.ooooo.', '.ooooo.', '.ooooo.', '.ooooo.', '.......']);
  assert.ok(coast(g, at(1, 1)));
  assert.ok(!coast(g, at(3, 3)));
});

test('maison : 1, +1 par maison voisine', () => {
  const g = island(['.......', '.mmm...', '..m....']);
  assert.equal(score(g, at(2, 1)), 1 + 3);
  assert.equal(score(g, at(1, 1)), 2);
});

test('parc : +1 par maison voisine, +1 au bord de l\'eau', () => {
  const g = island(['.......', '.ooooo.', '.omoo..', '.mpmo..', '.omoo..', '.ooooo.', '.......']);
  assert.equal(score(g, at(2, 3)), 4, 'trois... non, quatre maisons, loin de l\'eau');
  const h = island(['.......', '.p.....']);
  assert.equal(score(h, at(1, 1)), 1, 'seul au bord de l\'eau');
});

test('boutique, atelier, place, phare', () => {
  const g = island(['.......', '.ooooo.', '.mbao..', '.ooooo.', '.ooooo.', '.ooooo.', '.......']);
  assert.equal(score(g, at(2, 2)), 2, 'boutique : une maison + un atelier');
  assert.equal(score(g, at(3, 2)), 3, 'atelier sans maison voisine');
  const h = island(['.......', '.ooooo.', '.omao..', '.ooooo.']);
  assert.equal(score(h, at(3, 2)), 1, 'atelier : 3 − 2 par maison');
  const s = island(['.......', '.ooooo.', '.opoo..', '.mstoo.', '.oaoo..', '.ooooo.', '.......']);
  assert.equal(score(s, at(2, 3)), 3, 'place : parc, maison, atelier (le bois ne compte pas)');
  const f = island(['.......', '.f.....', '.......']);
  assert.equal(score(f, at(1, 1)), 4);
  const f2 = island(['.......', '.ooooo.', '.ooooo.', '.oofoo.', '.ooooo.', '.ooooo.', '.......']);
  assert.equal(score(f2, at(3, 3)), 0, 'phare loin de l\'eau');
});

test('le score total additionne les cases ; chaque vœu réalisé vaut 5', () => {
  const g = island(['.......', '.mm....', '.......'], ['quart', 'phare']);
  assert.equal(total(g), 4);
  assert.deepEqual(goalsDone(g), []);
  assert.equal(fullScore(g), 4);
  const h = island(['.......', '.mmmmm.', '.f.....'], ['quart', 'phare']);
  assert.deepEqual(goalsDone(h).sort(), ['phare', 'quart']);
  assert.equal(fullScore(h), total(h) + 10);
});

test('chaque vœu se reconnaît sur une petite ville', () => {
  const villes = {
    ronde: ['.......', '..m....', '.mpm...'], phare: ['f......'], marche: ['bbbb...'], quart: ['mmmmm..'],
    usine: ['aa.....'], carre: ['.......', '.p.....', 'msa....'], troc: ['aba....'], vert: ['ppp....'],
  };
  for (const gl of GOALS) {
    const g = island(villes[gl.id], [gl.id]);
    assert.ok(gl.test(g), gl.id);
    assert.ok(!gl.test(island([], [gl.id])), `${gl.id} sur une île vide`);
  }
});

test('biggest : plus grand groupe de cases d\'un type qui se touchent', () => {
  const g = island(['mm.m...', 'm..m...', '...m...', '...m...']);
  assert.equal(biggest(g, 'maison'), 4);
});

test('génération : 28 à 36 cases de terre d\'un seul tenant, 2 bois, sac de 30 cartes, 3 vœux différents', () => {
  for (let k = 0; k < 60; k++) {
    const g = makeIsland('essai-' + k);
    const land = g.cells.filter(c => c.land).length;
    assert.ok(land >= 28 && land <= 36, `${land} cases`);
    assert.equal(g.cells.filter(c => c.type === 'bois').length, 2);
    assert.equal(g.bag.length, Object.values(BAG).reduce((a, b) => a + b, 0));
    assert.equal(new Set(g.goals).size, 3);
    // d'un seul tenant
    const first = g.cells.findIndex(c => c.land); const seen = new Set([first]); const st = [first];
    while (st.length) { const i = st.pop(); for (const j of nb(i)) if (g.cells[j].land && !seen.has(j)) { seen.add(j); st.push(j); } }
    assert.equal(seen.size, land);
  }
});

test('même graine, même île ; graines différentes, îles différentes', () => {
  assert.deepEqual(makeIsland('jour-2026-11-27'), makeIsland('jour-2026-11-27'));
  assert.notDeepEqual(makeIsland('jour-2026-11-27').cells, makeIsland('jour-2026-11-28').cells);
});

test('étoiles : 40, 54, 66 habitants', () => {
  assert.deepEqual([39, 40, 53, 54, 65, 66, 90].map(stars), [0, 1, 1, 2, 2, 3, 3]);
});

test('nom d\'île au hasard : 5 caractères', () => {
  for (let i = 0; i < 50; i++) assert.match(randomName(), /^[a-z0-9]{5}$/);
});
