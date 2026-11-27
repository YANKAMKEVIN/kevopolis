// @ts-check
/** Sauvegarde versionnée (son coupé, record de chaque île) dans localStorage.
 *
 * Règle : toute modification du format incrémente SAVE_VERSION et ajoute une étape
 * à migrate(). Une sauvegarde abîmée ou plus récente que le jeu n'est jamais
 * écrasée en silence : elle est mise de côté sous KEY + '.abimee' et le jeu repart
 * des valeurs par défaut. L'ancien format (clés kevo-mute et kevo-best-<île>) est
 * repris une fois puis effacé. */

export const KEY = 'kevopolis.sauvegarde';
export const LEGACY_MUTE = 'kevo-mute';
export const LEGACY_BEST = 'kevo-best-';
export const SAVE_VERSION = 1;
/** Au-delà, on oublie les records des îles au hasard les plus faibles (l'île du jour change chaque jour). */
export const MAX_ILES = 400;

/** best : nom de l'île (graine) -> meilleur nombre d'habitants.
 * @typedef {{version:number,muted:boolean,best:Record<string,number>}} SaveData */

/** @returns {SaveData} */
export function defaults() { return { version: SAVE_VERSION, muted: false, best: {} }; }

/** @param {unknown} v */
const okScore = v => Number.isInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) <= 10000;
/** @param {string} k */
const okIsland = k => k.length > 0 && k.length <= 60;

/** Amène une sauvegarde d'une version antérieure à SAVE_VERSION ; null si inconnue ou trop récente.
 * @param {any} d @returns {any} */
export function migrate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const v = d.version;
  if (!Number.isInteger(v) || v < 1 || v > SAVE_VERSION) return null;
  const out = structuredClone(d);
  // Étapes futures, à chaîner ici :
  // if (out.version === 1) { out = v1ToV2(out); }
  return out;
}

/** @param {any} d @returns {d is SaveData} */
export function isValid(d) {
  if (!d || d.version !== SAVE_VERSION || typeof d.muted !== 'boolean') return false;
  if (!d.best || typeof d.best !== 'object' || Array.isArray(d.best)) return false;
  return Object.entries(d.best).every(([k, v]) => okIsland(k) && okScore(v));
}

/** Texte -> sauvegarde valide, ou null.
 * @param {string|null} text */
export function parse(text) {
  if (text == null) return null;
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  const d = migrate(raw);
  return isValid(d) ? d : null;
}

/** Clés de l'ancien format présentes dans le stockage.
 * @param {Storage} store @returns {string[]} */
function legacyKeys(store) {
  const out = [];
  for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && (k === LEGACY_MUTE || k.startsWith(LEGACY_BEST))) out.push(k); }
  return out;
}

/** Ancien format -> format actuel ; on garde ce qui est lisible.
 * @param {Record<string,string|null>} entries @returns {SaveData} */
export function fromLegacy(entries) {
  const d = defaults();
  for (const [k, v] of Object.entries(entries)) {
    if (k === LEGACY_MUTE) d.muted = v === '1';
    else if (k.startsWith(LEGACY_BEST)) { const isl = k.slice(LEGACY_BEST.length), n = Number(v); if (okIsland(isl) && okScore(n)) d.best[isl] = n; }
  }
  return d;
}

/** Lit la sauvegarde ; reprend l'ancien format ; repart des valeurs par défaut si elle manque ou est abîmée.
 * @param {Storage|null} store @returns {SaveData} */
export function load(store) {
  if (!store) return defaults();
  let text = null, old = [];
  try { text = store.getItem(KEY); if (text == null) old = legacyKeys(store); } catch { return defaults(); }
  if (text == null) {
    if (!old.length) return defaults();
    /** @type {Record<string,string|null>} */
    const entries = {};
    for (const k of old) entries[k] = store.getItem(k);
    const d = fromLegacy(entries);
    if (write(store, d)) { try { for (const k of old) store.removeItem(k); } catch { /* bloqué */ } }
    return d;
  }
  const d = parse(text);
  if (d) return d;
  try { store.setItem(KEY + '.abimee', text); store.removeItem(KEY); } catch { /* stockage plein ou bloqué */ }
  return defaults();
}

/** @param {Storage|null} store @param {SaveData} d @returns {boolean} */
export function write(store, d) {
  if (!store || !isValid(d)) return false;
  try { store.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}

/** Ajoute un score ; renvoie l'ancien record de l'île (0 s'il n'y en avait pas). Garde au plus MAX_ILES îles.
 * @param {SaveData} d @param {string} island @param {number} s */
export function addScore(d, island, s) {
  const old = d.best[island] || 0;
  if (s > old && okIsland(island) && okScore(s)) d.best[island] = s;
  const keys = Object.keys(d.best);
  if (keys.length > MAX_ILES) {
    keys.sort((a, b) => d.best[a] - d.best[b]);
    for (const k of keys.slice(0, keys.length - MAX_ILES)) if (k !== island) delete d.best[k];
  }
  return old;
}

/** Le stockage du navigateur, ou null s'il est bloqué (navigation privée, iframe…). */
export function browserStore() {
  try { const s = window.localStorage; s.getItem(KEY); return s; } catch { return null; }
}

/** Sauvegarde du jeu en cours (modifiée sur place, jamais remplacée). */
export const save = load(browserStore());
/** Écrit la sauvegarde du jeu en cours. */
export function persist() { return write(browserStore(), save); }
/** Enregistre le score d'une partie ; renvoie l'ancien record de l'île.
 * @param {string} island @param {number} s */
export function recordScore(island, s) { const old = addScore(save, island, s); persist(); return old; }
