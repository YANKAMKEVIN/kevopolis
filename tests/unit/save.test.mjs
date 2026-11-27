import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, LEGACY_MUTE, LEGACY_BEST, SAVE_VERSION, MAX_ILES, defaults, parse, migrate, isValid, load, write, fromLegacy, addScore } from '../../src/save.js';
import { memStore } from './helpers.mjs';

test('les valeurs par défaut sont valides', () => assert.ok(isValid(defaults())));

test('aller-retour : ce qui est sauvé est relu à l\'identique', () => {
  const st = memStore(); const d = defaults();
  d.muted = true; d.best = { 'jour-2026-11-27': 61, 'ile-ab12c': 48 };
  assert.ok(write(st, d));
  assert.deepEqual(load(st), d);
});

test('sauvegarde absente : valeurs par défaut', () => assert.deepEqual(load(memStore()), defaults()));

test('stockage bloqué (navigation privée) : le jeu tourne quand même', () => {
  const blocked = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() {}, key() { throw new Error('bloqué'); }, length: 0 };
  assert.deepEqual(load(blocked), defaults());
  assert.equal(write(blocked, defaults()), false);
  assert.deepEqual(load(null), defaults());
});

test('fichier abîmé : mis de côté, jamais écrasé en silence', () => {
  const bad = ['{pas du json', '[]', '"texte"', '{"version":1}',
    JSON.stringify({ ...defaults(), muted: 'oui' }), JSON.stringify({ ...defaults(), best: { x: -3 } }), JSON.stringify({ ...defaults(), best: { x: 2.5 } })];
  for (const b of bad) {
    const st = memStore({ [KEY]: b });
    assert.deepEqual(load(st), defaults(), b);
    assert.equal(st.getItem(KEY + '.abimee'), b);
    assert.equal(st.getItem(KEY), null);
  }
});

test('sauvegarde d\'une version plus récente du jeu : refusée', () => {
  const d = { ...defaults(), version: SAVE_VERSION + 1 };
  assert.equal(migrate(d), null);
  assert.equal(parse(JSON.stringify(d)), null);
});

test('ancien format (kevo-mute, kevo-best-<île>) : repris une fois, puis anciennes clés effacées', () => {
  const st = memStore({ [LEGACY_MUTE]: '1', [LEGACY_BEST + 'jour-2026-11-26']: '57', [LEGACY_BEST + 'ile-xy9z1']: '44', autre: 'garde' });
  const d = load(st);
  assert.equal(d.muted, true);
  assert.deepEqual(d.best, { 'jour-2026-11-26': 57, 'ile-xy9z1': 44 });
  assert.equal(st.getItem(LEGACY_MUTE), null);
  assert.equal(st.getItem(LEGACY_BEST + 'ile-xy9z1'), null);
  assert.equal(st.getItem('autre'), 'garde', 'les clés des autres jeux ne sont pas touchées');
  assert.deepEqual(JSON.parse(st.getItem(KEY)), d);
});

test('ancien format partiellement abîmé : on garde ce qui est lisible', () => {
  const d = fromLegacy({ [LEGACY_BEST + 'a']: 'beaucoup', [LEGACY_BEST + 'b']: '12', [LEGACY_MUTE]: '0' });
  assert.deepEqual(d.best, { b: 12 });
  assert.equal(d.muted, false);
});

test('record : gardé seulement s\'il est battu, l\'ancien est renvoyé', () => {
  const d = defaults();
  assert.equal(addScore(d, 'i', 40), 0);
  assert.equal(addScore(d, 'i', 35), 40);
  assert.equal(d.best.i, 40);
  assert.equal(addScore(d, 'i', 52), 40);
  assert.equal(d.best.i, 52);
});

test('au plus MAX_ILES îles retenues : on oublie les plus faibles', () => {
  const d = defaults();
  for (let i = 0; i < MAX_ILES + 20; i++) addScore(d, 'ile-' + i, 10 + (i % 50));
  assert.equal(Object.keys(d.best).length, MAX_ILES);
  assert.ok(isValid(d));
});
