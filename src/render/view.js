// @ts-check
/** Le canvas de l'île : taille (devicePixelRatio plafonné à 2), cadrage de l'île, cases <-> pixels. */
import { N } from '../rules.js';
import { etat } from '../state.js';
import { pen } from './draw.js';

/** @type {HTMLCanvasElement} */
export const cv = /** @type {HTMLCanvasElement} */ (document.getElementById('c'));
pen.ctx = /** @type {CanvasRenderingContext2D} */ (cv.getContext('2d'));
/** Le contexte de l'écran. */
export const screenCtx = pen.ctx;

export function resize() {
  etat.DPR = Math.min(window.devicePixelRatio || 1, 2); etat.W = innerWidth; etat.H = innerHeight;
  cv.width = etat.W * etat.DPR; cv.height = etat.H * etat.DPR;
  fit();
}
/** Cadre l'île dans la place laissée par le HUD et la main de cartes. */
export function fit() {
  if (!etat.G || !etat.W) return;
  // téléphone couché : les vœux et l'horloge sont sur les côtés, l'île peut monter tout en haut
  const land = etat.W > etat.H * 1.3 && etat.H < 560;
  const top = land ? 18 : etat.W < 700 ? 168 : 100, bot = etat.W < 700 ? 236 : land ? 150 : 176;
  const availH = Math.max(120, etat.H - top - bot), availW = land ? etat.W * .46 : etat.W * .94;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  etat.G.cells.forEach((c, i) => { if (!c.land) return; const x = i % N, y = (i / N) | 0, sx = (x - y) * .5, sy = (x + y) * .25 + .25; x0 = Math.min(x0, sx - .5); x1 = Math.max(x1, sx + .5); y0 = Math.min(y0, sy - .9); y1 = Math.max(y1, sy + .6); });
  etat.TW = Math.min(availW / (x1 - x0), availH / (y1 - y0), 140); etat.TH = etat.TW / 2;
  etat.OX = etat.W / 2 - etat.TW * (x0 + x1) / 2; etat.OY = top + (availH - etat.TW * (y1 - y0)) / 2 - etat.TW * y0;
}
addEventListener('resize', resize);
/** Centre du dessus de la case i, en pixels CSS. @param {number} i @returns {[number,number]} */
export function cellXY(i) { const x = i % N, y = (i / N) | 0; return [etat.OX + (x - y) * etat.TW / 2, etat.OY + (x + y) * etat.TH / 2 + etat.TH / 2]; }
/** Case sous un point de l'écran, ou -1. @param {number} mx @param {number} my */
export function pick(mx, my) {
  const u = (mx - etat.OX) / (etat.TW / 2), v = (my - etat.OY) / (etat.TH / 2);
  const x = Math.floor((u + v) / 2), y = Math.floor((v - u) / 2);
  if (x < 0 || y < 0 || x >= N || y >= N) return -1; return y * N + x;
}
