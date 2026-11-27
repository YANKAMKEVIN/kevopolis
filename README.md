# Kevopolis

Une île. Une journée. Une ville qui s'allume.

Kevopolis est un petit jeu de construction de ville très épuré, jouable dans le navigateur, sur ordinateur comme sur téléphone. Une partie dure environ cinq minutes.

## Le principe

Tu construis une ville sur une île en une seule journée. Chaque bâtiment posé fait avancer l'horloge d'une heure, de 6 h à minuit, et le ciel passe de l'aube au coucher de soleil puis à la nuit. À minuit, seuls les bâtiments « heureux » restent éclairés : ta ville brille selon la qualité de tes choix.

## Les bâtiments

| Bâtiment | Règle |
|---|---|
| Maison | 1 point, +1 par maison voisine |
| Parc | +1 par maison voisine, +1 au bord de l'eau |
| Boutique | +1 par maison ou atelier voisin |
| Atelier | 3 points, −2 par maison voisine |
| Place | +1 par type de voisin différent |
| Phare | 4 points au bord de l'eau, sinon 0 |

Seules les cases qui se touchent par un côté sont voisines. Les bois déjà présents sur l'île ne se construisent pas.

## Ce qu'il y a d'autre

- Trois vœux par île, +5 habitants chacun.
- Une île du jour, la même pour tout le monde, et des îles au hasard.
- Aperçu des points gagnés ou perdus avant de poser un bâtiment.
- Annuler un coup, changer sa main (coûte une heure, deux fois par partie).
- Score sur trois étoiles (40, 54, 66) et record gardé par île.
- Sons doux, que l'on peut couper.

## Raccourcis clavier

`1` `2` `3` pour choisir une carte, `R` pour une nouvelle main, `Z` pour annuler.

## Lancer le jeu

En ligne : https://yankamkevin.github.io/kevopolis/ (une fois GitHub Pages activé).

En local, le jeu est en modules ES : il faut un petit serveur (un double-clic sur `index.html` ne suffit plus).

```bash
npm start          # puis ouvrir http://localhost:8000
```

## Technique

Version 1.1.0 (affichée sur l'accueil). Pas d'étape de compilation : le navigateur charge `src/main.js`.

| Fichier | Rôle |
|---|---|
| `src/rules.js` | Règles : bâtiments, sac, vœux, score de chaque case, génération de l'île à partir d'une graine. Sans DOM. |
| `src/game.js` | Déroulé d'une partie : poser, nouvelle main, annuler, minuit. Sans DOM. |
| `src/save.js` | Sauvegarde versionnée. |
| `src/state.js` | État partagé. |
| `src/render.js`, `src/input.js`, `src/ui.js`, `src/audio.js` | Rendu isométrique, souris/doigt/clavier, interface, sons. |

Les types sont vérifiés par TypeScript sur le JavaScript (`// @ts-check` + JSDoc, `npm run types`).

## Sauvegarde

Clé `kevopolis.sauvegarde` dans le navigateur : `{ version, muted, best: { île: habitants } }` (400 îles au plus).
Tout changement de format incrémente `SAVE_VERSION` et ajoute une étape à `migrate()`.
Une sauvegarde abîmée ou d'une version plus récente est mise de côté sous `kevopolis.sauvegarde.abimee`, jamais écrasée.
L'ancien format (`kevo-mute` et `kevo-best-<île>`) est repris automatiquement une fois, puis effacé.

## Tests

```bash
npm install
npx playwright install chromium
npm test            # types + unitaires + fumée + partie complète ; captures dans test-results/
```

- `npm run unit` : score de chaque bâtiment, les 8 vœux, génération de l'île (taille, d'un seul tenant, même graine = même île), poser, nouvelle main, annuler, minuit, 20 parties simulées, sauvegarde (abîmée, trop récente, stockage bloqué, ancien format, records).
- `npm run smoke` : le jeu joue tout seul sur ordinateur, iPhone SE et Pixel 7 couché ; échoue sur toute erreur console, un bouton hors écran, une page qui déborde ou une chute d'images/s.
- `npm run partie` : l'île du jour jouée jusqu'à minuit en vrais clics, écran de fin, record et son retrouvés après rechargement, ancien format, sauvegarde abîmée ; puis une partie au doigt sur iPhone SE.

La CI GitHub (`.github/workflows/tests.yml`) lance tout sur chaque PR et bloque en cas d'échec. GitHub Pages publie directement la branche `main` (fichier `.nojekyll`).
