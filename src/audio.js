// @ts-check
/** Notes et accords générés avec la Web Audio API (rien à télécharger). */
import { save } from './save.js';
import { clamp } from './rules.js';
import { etat } from './state.js';

/** Le contexte audio, créé au premier geste du joueur. */
export function ac() {
  if (!etat.AC) {
    try { const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext; etat.AC = new AC(); } catch { /* pas de son */ }
  }
  if (etat.AC && etat.AC.state === 'suspended') etat.AC.resume().catch(() => {});
  return etat.AC;
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
/** @param {number} semi @param {number} [when] @param {number} [dur] @param {number} [vol] @param {OscillatorType} [type] */
export function note(semi, when = 0, dur = .9, vol = .12, type = 'sine') {
  const a = ac(); if (!a || save.muted) return; const t = a.currentTime + when; const f = 261.6 * Math.pow(2, semi / 12);
  const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(); o.type = type; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.001;
  const g2 = a.createGain(); g2.gain.value = .25; o2.connect(g2).connect(g); o.connect(g).connect(a.destination);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
}
/** Son d'une pose, plus aigu quand elle rapporte. @param {number} d */
export function sfx(d) { const k = clamp(3 + d, 0, PENTA.length - 1); note(PENTA[k] - (d < 0 ? 12 : 0), 0, .8, d < 0 ? .08 : .12); }
export function chime() { [0, 4, 7, 12].forEach((s, k) => note(s + 12, k * .09, 1.2, .08)); }
export function chord() { [0, 7, 12, 16, 19].forEach((s, k) => note(s - 5, k * .12, 2.6, .06)); }
