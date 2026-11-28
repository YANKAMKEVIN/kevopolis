// Garde-fous de structure : fichiers courts, typage vérifié partout, pas de DOM dans les règles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../../src/', import.meta.url).pathname;
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : []);
const all = files(SRC);

test('aucun fichier source de plus de 400 lignes', () => {
  for (const f of all) { const n = readFileSync(f, 'utf8').split('\n').length; assert.ok(n <= 400, `${f} : ${n} lignes`); }
});

test('chaque fichier source est vérifié par TypeScript (// @ts-check)', () => {
  for (const f of all) assert.ok(readFileSync(f, 'utf8').startsWith('// @ts-check'), f);
});

test('règles, île, archipel, jour, partie, bilan et sauvegarde : aucun accès au DOM au chargement', () => {
  for (const name of ['rules.js', 'island.js', 'archipel.js', 'daily.js', 'game.js', 'stats.js', 'state.js', 'types.js']) {
    const src = readFileSync(join(SRC, name), 'utf8');
    assert.ok(!/\bdocument\.|\bwindow\./.test(src), name);
  }
});
