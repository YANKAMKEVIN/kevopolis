// @ts-check
/** Accès aux éléments de la page. */

// ---------- interface ----------
/** Élément de la page par son id (la page est fixe : il existe toujours).
 * @param {string} id @returns {any} */
export const $=id=>document.getElementById(id);
