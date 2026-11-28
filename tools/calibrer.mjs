// Calibre les seuils d'étoiles des îles de l'archipel : un joueur glouton (meilleur coup à chaque heure)
// joue chaque île ; on affiche son score et les seuils proposés (1★ ≈ 75 %, 2★ ≈ 95 %, 3★ ≈ 115 % du glouton).
// Lancer : node tools/calibrer.mjs
import { LEVELS } from '../src/archipel.js';
import { greedyGame } from '../tests/unit/helpers.mjs';

for (const lv of LEVELS) {
  const r = greedyGame({ seed: 'archipel-' + lv.id, label: lv.nom, mode: 'archipel', level: lv.id });
  const p = [.75, .95, 1.15].map(k => Math.round(r.score * k));
  console.log(`${lv.id.padEnd(9)} glouton ${String(r.score).padStart(3)}  seuils actuels ${lv.stars.join('/')}  proposés ${p.join('/')}`);
}
