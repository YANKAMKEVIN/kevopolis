// @ts-check
/** Petits dessins hors de l'île : icônes des cartes (peintes ou dessinées) et miniatures des îles de l'archipel. */
import { N } from '../rules.js';
import { art } from '../art.js';
import { building, poly, swap, tileTop } from './draw.js';

/** @typedef {import('../types.js').Tile} Tile */
/** @typedef {import('../types.js').Island} Island */

/** Taille d'affichage d'un canvas (repli si pas encore mis en page). @param {HTMLCanvasElement} canvas @param {number} w @param {number} h */
function size(canvas, w, h) { const r = canvas.getBoundingClientRect(); return [r.width || w, r.height || h]; }

/** Icône d'un bâtiment : carte peinte si elle est prête, sinon le bâtiment dessiné par le même moteur que l'île.
 * @param {HTMLCanvasElement|null} canvas @param {Tile} type */
export function icon(canvas, type) {
  if (!canvas) return;
  const [w, h] = size(canvas, 64, 56), d = 2;
  canvas.width = w * d; canvas.height = h * d; const c2 = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const img = art('carte_' + type);
  if (img) { c2.setTransform(d, 0, 0, d, 0, 0); c2.clearRect(0, 0, w, h); const z = Math.min(w, h) * 1.08; c2.drawImage(img, (w - z) / 2, (h - z) / 2 + h * .04, z, z); return; }
  swap(c2, () => {
    c2.setTransform(d, 0, 0, d, 0, 0); c2.clearRect(0, 0, w, h); const s = w * .36, x = w / 2, y = h * .68;
    poly([[x, y - s / 2], [x + s, y], [x, y + s / 2], [x - s, y]], tileTop(type));
    poly([[x - s, y], [x, y + s / 2], [x, y + s / 2 + s * .2], [x - s, y + s * .2]], '#c8b28e'); poly([[x, y + s / 2], [x + s, y], [x + s, y + s * .2], [x, y + s / 2 + s * .2]], '#a8916f');
    building(type, x, y, s, 1, false, 0, 0, 1);
  });
}

/** Miniature isométrique d'une île (forme, bois, et bâtiments en pastilles), pour le choix des îles.
 * @param {HTMLCanvasElement} canvas @param {Island} g @param {boolean} [dim] île fermée : grisée */
export function thumb(canvas, g, dim = false) {
  const [w, h] = size(canvas, 96, 64), d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * d; canvas.height = h * d; const c2 = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  swap(c2, () => {
    c2.setTransform(d, 0, 0, d, 0, 0); c2.clearRect(0, 0, w, h);
    // cadrage sur la terre seule (comme fit() pour l'île en grand)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    g.cells.forEach((c, i) => { if (!c.land) return; const x = i % N, y = (i / N) | 0, sx = (x - y) * .5, sy = (x + y) * .25; x0 = Math.min(x0, sx - .5); x1 = Math.max(x1, sx + .5); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy + .5 + .18); });
    const tw = Math.min(w * .94 / (x1 - x0), h * .9 / (y1 - y0)), th = tw / 2;
    const ox = w / 2 - tw * (x0 + x1) / 2, oy = (h - tw * (y1 - y0)) / 2 - tw * y0;
    const top = dim ? '#c9c6bd' : '#ece4cf', side = dim ? '#a29d92' : '#c8b28e';
    for (let s = 0; s < 2 * N - 1; s++) for (let x = 0; x < N; x++) {
      const y = s - x; if (y < 0 || y >= N) continue;
      const c = g.cells[y * N + x]; if (!c.land) continue;
      const cx = ox + (x - y) * tw / 2, cy = oy + (x + y) * th / 2 + th / 2;
      poly([[cx - tw / 2, cy], [cx, cy + th / 2], [cx, cy + th / 2 + th * .35], [cx - tw / 2, cy + th * .35]], side);
      poly([[cx, cy + th / 2], [cx + tw / 2, cy], [cx + tw / 2, cy + th * .35], [cx, cy + th / 2 + th * .35]], side);
      poly([[cx, cy - th / 2], [cx + tw / 2, cy], [cx, cy + th / 2], [cx - tw / 2, cy]], c.type === 'bois' ? (dim ? '#a9b3a0' : '#93bd7a') : top);
    }
  });
}
