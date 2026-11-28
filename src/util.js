// @ts-check
/** Accès aux éléments de la page. */

/** Élément de la page par son id (la page est fixe : il existe toujours ; erreur sinon).
 * @template {HTMLElement} [E=HTMLElement] @param {string} id @returns {E} */
export function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error('élément introuvable : #' + id);
  return /** @type {E} */ (el);
}
/** Bouton de la page par son id. @param {string} id @returns {HTMLButtonElement} */
export const btn = id => $(id);
/** Échappe un texte pour l'insérer dans du HTML. @param {string} s */
export const esc = s => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
