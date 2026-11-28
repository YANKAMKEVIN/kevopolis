// Règles de score, bâtiment par bâtiment, avec les cas limites (bords de carte, lagon, bois, voisins en diagonale).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, total, coast, around, KINDS, T, stars, STARS } from '../../src/rules.js';
import { island, at } from './helpers.mjs';

// Une grande île pleine : rien n'est au bord de l'eau sauf la couronne extérieure.
const plein = rows => island(['ooooooo', ...rows.map(r => r.padEnd(7, 'o')), 'ooooooo', 'ooooooo', 'ooooooo', 'ooooooo'].slice(0, 7));

test('case vide, mer et bois : 0 point', () => {
  const g = island(['t......', 'mo.....']);
  assert.equal(score(g, at(0, 0)), 0, 'bois');
  assert.equal(score(g, at(1, 1)), 0, 'terre vide');
  assert.equal(score(g, at(5, 5)), 0, 'mer');
});

test('maison : 1 seule, +1 par maison voisine, jusqu\'à 5', () => {
  assert.equal(score(island(['m']), 0), 1);
  const g = plein(['ooo', 'omo', 'mmm', 'omo']);
  assert.equal(score(g, at(1, 3)), 5, 'quatre maisons autour');
  assert.equal(score(g, at(0, 3)), 2);
});

test('maison : les diagonales et les autres bâtiments ne comptent pas', () => {
  const g = plein(['m.m', '.m.', 'm.m']);
  assert.equal(score(g, at(1, 2)), 1, 'diagonales');
  const h = plein(['opo', 'bma', 'ofo']);
  assert.equal(score(h, at(1, 2)), 1, 'parc, boutique, atelier, phare autour');
});

test('parc : +1 par maison voisine, +1 au bord de l\'eau, 0 seul à l\'intérieur', () => {
  assert.equal(score(plein(['', 'oooo', 'ooop']), at(3, 3)), 0, 'seul, loin de l\'eau');
  assert.equal(score(plein(['', 'ooom', 'oomp', 'ooom']), at(3, 3)), 3, 'trois maisons, à l\'intérieur');
  assert.equal(score(island(['mpm', '.m.']), at(1, 0)), 3 + 1, 'trois maisons, au bord de la carte');
  assert.equal(score(island(['p']), 0), 1, 'seul au bord');
});

test('parc et phare : le lagon intérieur compte comme la mer', () => {
  const lagon = ['.......', '.ooooo.', '.ooooo.', '.oo.oo.', '.ooooo.', '.ooooo.', '.......'];
  const g = island(lagon);
  assert.ok(coast(g, at(3, 2)), 'au bord du lagon');
  assert.ok(!coast(g, at(2, 2)), 'diagonale du lagon : pas au bord');
  const p = island(lagon.map((r, y) => y === 2 ? '.oopoo.' : r));
  assert.equal(score(p, at(3, 2)), 1);
  const f = island(lagon.map((r, y) => y === 4 ? '.oofoo.' : r));
  assert.equal(score(f, at(3, 4)), 4);
});

test('boutique : +1 par maison ou atelier voisin, rien pour le reste', () => {
  assert.equal(score(plein(['', 'omo', 'abm', 'oao']), at(1, 3)), 4, 'deux maisons, deux ateliers');
  assert.equal(score(plein(['', 'opo', 'sbf', 'obo']), at(1, 3)), 0, 'parc, place, phare, boutique');
  assert.equal(score(island(['bt']), 0), 0, 'à côté d\'un bois');
});

test('atelier : 3, −2 par maison voisine (jusqu\'à −5)', () => {
  const vals = [0, 1, 2, 3, 4].map(n => {
    const ring = ['m', 'm', 'm', 'm'].map((m, k) => (k < n ? m : 'o'));
    return score(plein(['', `o${ring[0]}o`, `${ring[1]}a${ring[2]}`, `o${ring[3]}o`]), at(1, 3));
  });
  assert.deepEqual(vals, [3, 1, -1, -3, -5]);
  assert.equal(score(plein(['', 'oao', 'aaa', 'oao']), at(1, 3)), 3, 'les ateliers voisins ne gênent pas');
});

test('place : +1 par type de voisin différent (bois et doublons exclus)', () => {
  assert.equal(score(plein(['', 'oso']), at(1, 2)), 0, 'seule');
  assert.equal(score(plein(['', 'omo', 'msm', 'omo']), at(1, 3)), 1, 'quatre maisons = un seul type');
  assert.equal(score(plein(['', 'omo', 'psa', 'obo']), at(1, 3)), 4, 'quatre types');
  assert.equal(score(plein(['', 'oto', 'tst', 'oso']), at(1, 3)), 1, 'les bois ne comptent pas, une place voisine oui');
});

test('phare : 4 au bord de l\'eau (bord de carte ou mer), 0 à l\'intérieur, voisins sans effet', () => {
  assert.equal(score(island(['f']), 0), 4);
  assert.equal(score(island(['.......', '.f.....']), at(1, 1)), 4, 'entouré de mer');
  assert.equal(score(plein(['', 'omo', 'mfm', 'omo']), at(1, 3)), 0, 'à l\'intérieur');
});

test('le total est la somme des cases ; poser une maison près d\'un atelier coûte 2', () => {
  const g = plein(['', 'ooo', 'oao']);
  const avant = total(g);
  g.cells[at(1, 2)].type = 'maison';
  assert.equal(total(g) - avant, 1 - 2);
  assert.equal(total(g), g.cells.reduce((s, _c, i) => s + score(g, i), 0));
});

test('around : compte les voisins d\'un type', () => {
  const g = plein(['', 'omo', 'mpt', 'omo']);
  assert.equal(around(g, at(1, 3), 'maison'), 3);
  assert.equal(around(g, at(1, 3), 'bois'), 1);
});

test('chaque bâtiment a un nom et une règle affichée', () => {
  for (const k of KINDS) { assert.ok(T[k].nom.length > 2); assert.ok(T[k].regle.length > 2); }
});

test('étoiles : seuils de l\'île (classiques par défaut), bornes comprises', () => {
  assert.deepEqual(STARS, [40, 54, 66]);
  assert.deepEqual([0, 9, 10, 19, 20, 29, 30].map(s => stars(s, [10, 20, 30])), [0, 0, 1, 1, 2, 2, 3]);
  assert.equal(stars(-4), 0);
});
