// Génération des îles : chaque forme, déterminisme, et l'île d'origine inchangée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeIsland, SHAPES, SHAPE_IDS, components, bagOf } from '../../src/island.js';
import { BAG, GOALS, STARS, nb } from '../../src/rules.js';

const landCount = g => g.cells.filter(c => c.land).length;

test('chaque forme : taille permise, deux bois jamais côte à côte, sac de 30 cartes, trois vœux classiques différents', () => {
  for (const id of SHAPE_IDS) {
    const sh = SHAPES[id];
    for (let k = 0; k < 80; k++) {
      const g = makeIsland(`essai-${id}-${k}`, { shape: id });
      const n = landCount(g);
      assert.ok(n >= sh.min && n <= sh.max, `${id} ${k} : ${n} cases`);
      const bois = g.cells.map((c, i) => c.type === 'bois' ? i : -1).filter(i => i >= 0);
      assert.equal(bois.length, 2, id);
      assert.ok(!nb(bois[0]).includes(bois[1]), `${id} : bois côte à côte`);
      assert.ok(bois.every(i => g.cells[i].land));
      assert.equal(g.bag.length, 30);
      assert.equal(new Set(g.goals).size, 3);
      assert.ok(g.goals.every(x => GOALS.some(gl => gl.id === x)));
      assert.equal(g.shape, id);
      // au moins 18 cases libres : la journée entière peut se jouer
      assert.ok(g.cells.filter(c => c.land && !c.type).length >= 18);
    }
  }
});

test('formes d\'un seul tenant : une seule composante ; « trois îlots » : au moins deux îlots de 4 cases', () => {
  for (const id of SHAPE_IDS) for (let k = 0; k < 40; k++) {
    const comps = components(makeIsland(`tenant-${k}`, { shape: id }).cells);
    if (SHAPES[id].connected) assert.equal(comps.length, 1, `${id} ${k}`);
    else { assert.ok(comps.length >= 2, `${id} ${k}`); assert.ok(comps.every(c => c.length >= 4)); }
  }
});

test('l\'atoll a un lagon : des cases de mer à l\'intérieur, loin du bord de la carte', () => {
  for (let k = 0; k < 30; k++) {
    const g = makeIsland('lagon-' + k, { shape: 'atoll' });
    const inner = g.cells.some((c, i) => !c.land && i % 7 > 0 && i % 7 < 6 && i > 7 && i < 41 && nb(i).every(j => g.cells[j].land || nb(j).some(q => g.cells[q].land)));
    assert.ok(inner, 'lagon ' + k);
  }
});

test('même graine et même forme : même île ; formes différentes : îles différentes', () => {
  for (const id of SHAPE_IDS) assert.deepEqual(makeIsland('x', { shape: id }), makeIsland('x', { shape: id }));
  const lands = new Set(SHAPE_IDS.map(id => makeIsland('x', { shape: id }).cells.map(c => +c.land).join('')));
  assert.equal(lands.size, SHAPE_IDS.length);
});

test('île d\'origine inchangée : les graines déjà jouées donnent la même île qu\'avant', () => {
  const g = makeIsland('jour-2026-11-27');
  assert.equal(g.cells.map(c => c.land ? (c.type ? 't' : '#') : '.').join(''), '........###t..####################t.####...#.....');
  assert.deepEqual(g.goals, ['usine', 'quart', 'vert']);
  assert.deepEqual(g.bag.slice(0, 5), ['atelier', 'maison', 'atelier', 'parc', 'boutique']);
  assert.equal(g.shape, 'ronde'); assert.deepEqual(g.stars, STARS);
});

test('options : vœux imposés, sac sur mesure, seuils d\'étoiles', () => {
  const comp = { maison: 4, parc: 4, boutique: 4, atelier: 4, place: 4, phare: 10 };
  const g = makeIsland('opt', { goals: ['veille', 'rue', 'calme'], bag: comp, stars: [1, 2, 3] });
  assert.deepEqual(g.goals, ['veille', 'rue', 'calme']);
  assert.equal(g.bag.filter(k => k === 'phare').length, 10);
  assert.deepEqual(g.stars, [1, 2, 3]);
});

test('sac : la composition classique fait 30 cartes', () => {
  assert.equal(bagOf(BAG).length, 30);
  assert.deepEqual(bagOf({ maison: 2, phare: 1 }), ['maison', 'maison', 'phare']);
});

test('forme inconnue : erreur claire', () => {
  assert.throws(() => makeIsland('x', { shape: 'carree' }), /forme inconnue/);
});
