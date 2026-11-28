// Outils communs aux tests unitaires : on joue avec les vraies règles (src/), sans navigateur.
import { etat } from '../../src/state.js';
import { hooks, newGame, place } from '../../src/game.js';
import { N, total, fullScore } from '../../src/rules.js';

export { etat, hooks };

/** Partie au hasard sur une graine donnée (forme d'origine). */
export const spec = (seed, mode = 'hasard') => ({ seed, label: 'test', mode });

/** localStorage en mémoire (avec key/length, comme le vrai). */
export function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
    key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, m,
  };
}

/** Île vide fabriquée à la main : `rows` est une liste de chaînes, '.' mer, 'o' terre libre,
 * m maison, p parc, b boutique, a atelier, s place, f phare, t bois. */
export function island(rows, goals = []) {
  const map = { m: 'maison', p: 'parc', b: 'boutique', a: 'atelier', s: 'place', f: 'phare', t: 'bois' };
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = (rows[y] || '')[x] || '.';
    cells.push({ land: ch !== '.', type: map[ch] || null, born: 0 });
  }
  return { cells, seedStr: 'test', bag: [], goals, shape: 'ronde', stars: [40, 54, 66] };
}
/** Index d'une case. */
export const at = (x, y) => y * N + x;

/** Partie complète jouée par un joueur glouton : à chaque heure, la carte et la case qui rapportent le plus. */
export function greedyGame(spec) {
  newGame(typeof spec === 'string' ? { seed: spec, label: 'test', mode: 'hasard' } : spec);
  let coups = 0;
  while (!etat.over && coups < 100) {
    let best = null;
    etat.hand.forEach((t, k) => {
      if (!t) return;
      etat.G.cells.forEach((c, i) => {
        if (!c.land || c.type) return;
        c.type = t; const v = fullScore(etat.G); c.type = null;
        if (!best || v > best.v) best = { v, k, i };
      });
    });
    if (!best) break;
    etat.sel = best.k; place(best.i); coups++;
  }
  return { coups, score: fullScore(etat.G), base: total(etat.G) };
}
