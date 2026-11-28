// @ts-check
/** Sauvegarde versionnée (son coupé, record de chaque île, jours joués, parties) dans localStorage.
 *
 * Règle : toute modification du format incrémente SAVE_VERSION et ajoute une étape
 * à migrate(). Une sauvegarde abîmée ou plus récente que le jeu n'est jamais
 * écrasée en silence : elle est mise de côté sous KEY + '.abimee' et le jeu repart
 * des valeurs par défaut. L'ancien format (clés kevo-mute et kevo-best-<île>) est
 * repris une fois puis effacé.
 *
 * Historique : v1 { version, muted, best } ; v2 ajoute days (score de l'île du jour par date)
 * et games (parties terminées). La v1 → v2 retrouve les jours dans les records « jour-AAAA-MM-JJ ». */

export const KEY = 'kevopolis.sauvegarde';
export const LEGACY_MUTE = 'kevo-mute';
export const LEGACY_BEST = 'kevo-best-';
export const SAVE_VERSION = 2;
/** Au-delà, on oublie les records des îles au hasard les plus faibles (l'île du jour change chaque jour). */
export const MAX_ILES = 400;
/** Au-delà, on oublie les jours les plus anciens. */
export const MAX_DAYS = 120;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** best : nom de l'île (graine) -> meilleur nombre d'habitants ; days : AAAA-MM-JJ -> meilleur score de l'île du jour.
 * @typedef {{version:number,muted:boolean,best:Record<string,number>,days:Record<string,number>,games:number}} SaveData */

/** @returns {SaveData} */
export function defaults() { return { version: SAVE_VERSION, muted: false, best: {}, days: {}, games: 0 }; }

/** @param {unknown} v @returns {v is number} */
const okScore = v => Number.isInteger(v) && /** @type {number} */ (v) >= 0 && /** @type {number} */ (v) <= 10000;
/** @param {string} k */
const okIsland = k => k.length > 0 && k.length <= 60;
/** @param {unknown} v @returns {v is Record<string,unknown>} */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

/** Étapes de migration : MIGRATIONS[v] amène une sauvegarde de la version v à v + 1.
 * @type {Record<number,(d:any)=>any>} */
export const MIGRATIONS = {
  1: d => {
    /** @type {Record<string,number>} */ const days = {};
    if (isObj(d.best)) for (const [k, v] of Object.entries(d.best)) {
      const day = k.startsWith('jour-') ? k.slice(5) : '';
      if (DAY_RE.test(day) && okScore(v)) days[day] = v;
    }
    return { ...d, version: 2, days, games: 0 };
  },
};

/** Amène une sauvegarde d'une version antérieure à SAVE_VERSION ; null si inconnue ou trop récente.
 * @param {any} d @returns {any} */
export function migrate(d) {
  if (!isObj(d)) return null;
  const v = d.version;
  if (!Number.isInteger(v) || /** @type {number} */ (v) < 1 || /** @type {number} */ (v) > SAVE_VERSION) return null;
  /** @type {any} */
  let out = structuredClone(d);
  while (out.version < SAVE_VERSION) {
    const step = MIGRATIONS[out.version];
    if (!step) return null;
    out = step(out);
  }
  return out;
}

/** @param {any} d @returns {d is SaveData} */
export function isValid(d) {
  if (!isObj(d) || d.version !== SAVE_VERSION || typeof d.muted !== 'boolean') return false;
  if (!isObj(d.best) || !isObj(d.days) || !okScore(d.games)) return false;
  return Object.entries(d.best).every(([k, v]) => okIsland(k) && okScore(v))
    && Object.entries(d.days).every(([k, v]) => DAY_RE.test(k) && okScore(v));
}

/** Texte -> sauvegarde valide, ou null.
 * @param {string|null} text @returns {SaveData|null} */
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
  return MIGRATIONS[1]({ ...d, version: 1 });
}

/** Lit la sauvegarde ; reprend l'ancien format ; repart des valeurs par défaut si elle manque ou est abîmée.
 * Une sauvegarde d'une version antérieure est réécrite au format actuel.
 * @param {Storage|null} store @returns {SaveData} */
export function load(store) {
  if (!store) return defaults();
  /** @type {string|null} */ let text = null;
  /** @type {string[]} */ let old = [];
  try { text = store.getItem(KEY); if (text == null) old = legacyKeys(store); } catch { return defaults(); }
  if (text == null) {
    if (!old.length) return defaults();
    /** @type {Record<string,string|null>} */
    const entries = {};
    try { for (const k of old) entries[k] = store.getItem(k); } catch { return defaults(); }
    const d = fromLegacy(entries);
    if (write(store, d)) { try { for (const k of old) store.removeItem(k); } catch { /* bloqué */ } }
    return d;
  }
  const d = parse(text);
  if (d) {
    // version antérieure : on garde une copie de l'original, puis on réécrit au format actuel
    try { if (JSON.parse(text).version !== SAVE_VERSION) { store.setItem(KEY + '.v' + JSON.parse(text).version, text); write(store, d); } } catch { /* plein ou bloqué */ }
    return d;
  }
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

/** Retient le score de l'île du jour pour la date `day` (le meilleur du jour). Garde au plus MAX_DAYS jours.
 * @param {SaveData} d @param {string} day @param {number} s */
export function addDay(d, day, s) {
  if (!DAY_RE.test(day) || !okScore(s)) return;
  d.days[day] = Math.max(d.days[day] || 0, s);
  const keys = Object.keys(d.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete d.days[k];
}

/** Le stockage du navigateur, ou null s'il est bloqué (navigation privée, iframe…). */
export function browserStore() {
  try { const s = window.localStorage; s.getItem(KEY); return s; } catch { return null; }
}

/** Sauvegarde du jeu en cours (modifiée sur place, jamais remplacée). */
export const save = load(browserStore());
/** Écrit la sauvegarde du jeu en cours. */
export function persist() { return write(browserStore(), save); }
/** Enregistre une partie terminée ; renvoie l'ancien record de l'île.
 * @param {string} island @param {number} s @param {string|null} [day] date si c'est l'île du jour */
export function recordScore(island, s, day = null) {
  const old = addScore(save, island, s);
  if (day) addDay(save, day, s);
  save.games = Math.min(save.games + 1, 10000);
  persist();
  return old;
}
