// L'île du jour : date locale, forme du jour, série et semaine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, daySeed, dayShape, daysBetween, prevDay, streak, lastDays } from '../../src/daily.js';
import { SHAPE_IDS } from '../../src/island.js';

test('dayKey : la date locale, pas la date UTC (correction : à 0 h 30 à Paris, c\'est déjà le lendemain)', () => {
  const tz = process.env.TZ;
  process.env.TZ = 'Europe/Paris';
  try {
    const d = new Date('2026-11-27T23:30:00Z'); // 0 h 30 le 28 à Paris
    assert.equal(d.toISOString().slice(0, 10), '2026-11-27', 'ancien calcul : la veille');
    assert.equal(dayKey(d), '2026-11-28');
  } finally { if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz; }
  assert.equal(dayKey(new Date(2026, 0, 5, 12)), '2026-01-05');
});

test('graine et forme du jour : déterministes, toutes les formes reviennent', () => {
  assert.equal(daySeed('2026-11-28'), 'jour-2026-11-28');
  assert.equal(dayShape('2026-11-28'), dayShape('2026-11-28'));
  const seen = new Set();
  let day = '2026-12-31';
  for (let k = 0; k < 90; k++) { seen.add(dayShape(day)); assert.ok(SHAPE_IDS.includes(dayShape(day))); day = prevDay(day); }
  assert.equal(seen.size, SHAPE_IDS.length);
});

test('veille : changements de mois, d\'année et 29 février', () => {
  assert.equal(prevDay('2026-03-01'), '2026-02-28');
  assert.equal(prevDay('2028-03-01'), '2028-02-29');
  assert.equal(prevDay('2027-01-01'), '2026-12-31');
  assert.equal(daysBetween('2026-11-28', '2026-12-05'), 7);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2, 'passage à l\'heure d\'été sans effet');
});

test('série : jours d\'affilée finissant au jour donné', () => {
  const days = { '2026-11-25': 40, '2026-11-26': 50, '2026-11-27': 60, '2026-11-23': 30 };
  assert.equal(streak(days, '2026-11-27'), 3);
  assert.equal(streak(days, '2026-11-28'), 0);
  assert.equal(streak(days, '2026-11-23'), 1);
  assert.equal(streak({}, '2026-11-27'), 0);
});

test('semaine : sept jours du plus ancien au jour donné, null pour les jours non joués', () => {
  const w = lastDays({ '2026-11-28': 61, '2026-11-24': 44 }, '2026-11-28');
  assert.equal(w.length, 7);
  assert.equal(w[0].day, '2026-11-22'); assert.equal(w[6].day, '2026-11-28');
  assert.deepEqual(w.map(x => x.score), [null, null, 44, null, null, null, 61]);
});
