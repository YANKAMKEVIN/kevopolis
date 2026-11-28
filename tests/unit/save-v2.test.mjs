// Sauvegarde v2 : migration depuis la v1, jours de l'île du jour, résistance aux données abîmées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, SAVE_VERSION, MAX_DAYS, MIGRATIONS, defaults, migrate, isValid, parse, load, write, addDay, addScore } from '../../src/save.js';
import { memStore } from './helpers.mjs';

const v1 = { version: 1, muted: true, best: { 'jour-2026-11-26': 57, 'jour-2026-11-27': 61, 'ile-ab12c': 48, 'jour-pas-une-date': 3 } };

test('version actuelle : 2, une étape de migration par version antérieure', () => {
  assert.equal(SAVE_VERSION, 2);
  for (let v = 1; v < SAVE_VERSION; v++) assert.equal(typeof MIGRATIONS[v], 'function');
});

test('v1 → v2 : records gardés, jours retrouvés dans les records de l\'île du jour', () => {
  const d = migrate(v1);
  assert.ok(isValid(d));
  assert.deepEqual(d.best, v1.best);
  assert.deepEqual(d.days, { '2026-11-26': 57, '2026-11-27': 61 });
  assert.equal(d.games, 0); assert.equal(d.muted, true);
  assert.equal(v1.version, 1, 'l\'original n\'est pas modifié');
});

test('chargement d\'une v1 : réécrite en v2, l\'original gardé à côté', () => {
  const text = JSON.stringify(v1), st = memStore({ [KEY]: text });
  const d = load(st);
  assert.equal(d.version, 2);
  assert.deepEqual(JSON.parse(st.getItem(KEY)), d);
  assert.equal(st.getItem(KEY + '.v1'), text);
  assert.deepEqual(load(st), d, 'deuxième chargement identique');
});

test('v2 : aller-retour complet', () => {
  const st = memStore(), d = defaults();
  d.best = { 'archipel-lagon': 66 }; d.days = { '2026-11-28': 52 }; d.games = 12;
  assert.ok(write(st, d)); assert.deepEqual(load(st), d);
});

test('v2 abîmée : jours mal formés, parties négatives, champs manquants → mise de côté', () => {
  const bad = [
    { ...defaults(), days: { 'hier': 3 } }, { ...defaults(), days: { '2026-11-28': -1 } }, { ...defaults(), days: [] },
    { ...defaults(), games: -2 }, { ...defaults(), games: 1.5 }, { version: 2, muted: false, best: {} },
    { version: 0, muted: false, best: {} }, { version: '1', muted: false, best: {} }, { ...defaults(), best: { ['x'.repeat(61)]: 3 } },
  ];
  for (const b of bad) {
    const text = JSON.stringify(b), st = memStore({ [KEY]: text });
    assert.deepEqual(load(st), defaults(), text);
    assert.equal(st.getItem(KEY + '.abimee'), text);
  }
});

test('n\'importe quel texte : jamais d\'exception, toujours une sauvegarde valide', () => {
  const samples = ['', ' ', 'null', 'true', '0', '{}', '{"version":2}', '\u0000', '{"version":1,"muted":false,"best":null}', '{"__proto__":{"version":2}}', '[1,2,3]', 'NaN'];
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let k = 0; k < 300; k++) samples.push(Array.from({ length: (rnd() * 40) | 0 }, () => String.fromCharCode(32 + ((rnd() * 95) | 0))).join(''));
  for (const s of samples) {
    const d = load(memStore({ [KEY]: s }));
    assert.ok(isValid(d), JSON.stringify(s));
  }
});

test('stockage plein : l\'écriture échoue sans planter', () => {
  const st = memStore(); st.setItem = () => { throw new DOMException('plein', 'QuotaExceededError'); };
  assert.equal(write(st, defaults()), false);
  assert.ok(isValid(load(st)));
});

test('migration d\'une version sans étape connue : refusée', () => {
  const keep = MIGRATIONS[1];
  delete MIGRATIONS[1];
  try { assert.equal(migrate(v1), null); } finally { MIGRATIONS[1] = keep; }
  assert.equal(parse(JSON.stringify({ ...defaults(), version: 99 })), null);
});

test('jours : le meilleur score du jour, au plus MAX_DAYS jours, dates mal formées ignorées', () => {
  const d = defaults();
  addDay(d, '2026-11-28', 40); addDay(d, '2026-11-28', 35); addDay(d, '2026-11-28', 52);
  assert.equal(d.days['2026-11-28'], 52);
  addDay(d, '28/11/2026', 10); addDay(d, '2026-11-27', -3);
  assert.deepEqual(Object.keys(d.days), ['2026-11-28']);
  for (let k = 0; k < MAX_DAYS + 30; k++) addDay(d, `2025-${String(1 + (k % 12)).padStart(2, '0')}-${String(1 + ((k / 12) | 0)).padStart(2, '0')}`, k);
  assert.equal(Object.keys(d.days).length, MAX_DAYS);
  assert.ok('2026-11-28' in d.days, 'le plus récent est gardé');
  assert.ok(isValid(d));
});

test('record : score invalide ignoré', () => {
  const d = defaults();
  assert.equal(addScore(d, 'i', -5), 0); assert.equal(addScore(d, 'i', 3.5), 0); assert.equal(addScore(d, '', 10), 0);
  assert.deepEqual(d.best, {});
});
