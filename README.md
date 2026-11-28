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

## Trois façons de jouer

- **L'île du jour** : la même pour tout le monde, avec une forme de carte qui change chaque jour
  (ronde, atoll, croissant, jumelles, presqu'île, trois îlots). L'écran de fin montre la semaine et la série de jours joués.
- **L'archipel** : douze îles faites à la main, chacune sa forme, son sac de cartes, ses trois vœux et ses propres
  seuils d'étoiles (calibrés par `npm run calibrer`). Les étoiles gagnées ouvrent les îles suivantes.
- **Une île au hasard** : la forme d'origine, une graine tirée au sort.

## Ce qu'il y a d'autre

- Trois vœux par île, +5 habitants chacun (huit vœux classiques, six de plus dans l'archipel).
- Aperçu des points gagnés ou perdus avant de poser un bâtiment.
- Annuler un coup, changer sa main (coûte une heure, deux fois par partie).
- Score sur trois étoiles (40, 54, 66 pour les îles classiques) et record gardé par île.
- Écran de fin : barre des étoiles, habitants par bâtiment, vœux, meilleur coup, record, semaine de l'île du jour, île suivante.
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

Version 1.2.0 (affichée sur l'accueil). Pas d'étape de compilation : le navigateur charge `src/main.js`.
Tout le JavaScript est vérifié par TypeScript en mode strict (`// @ts-check` + JSDoc, `noImplicitAny`,
`noUnusedParameters`…, `npm run types`) ; les types partagés sont dans `src/types.js`.

| Fichier | Rôle |
|---|---|
| `src/rules.js` | Règles : bâtiments, score de chaque case, vœux, étoiles. Sans DOM. |
| `src/island.js` | Formes de carte et génération d'une île à partir d'une graine. Sans DOM. |
| `src/archipel.js` | Les douze îles de l'archipel, leurs seuils et leur ouverture. Sans DOM. |
| `src/daily.js` | Île du jour : date locale, forme du jour, série, semaine. Sans DOM. |
| `src/game.js` | Déroulé d'une partie : poser, nouvelle main, annuler, minuit, meilleur coup. Sans DOM. |
| `src/stats.js` | Bilan de l'écran de fin. Sans DOM. |
| `src/save.js` | Sauvegarde versionnée et migrations. |
| `src/state.js`, `src/types.js` | État partagé, types. |
| `src/render/` | `view.js` (canvas, cadrage, case sous le doigt), `frame.js` (boucle d'affichage), `draw.js` (bâtiments), `icons.js` (cartes, miniatures d'îles). |
| `src/ui.js`, `src/menu.js`, `src/endscreen.js` | Interface en jeu, accueil et archipel, écran de fin. |
| `src/input.js`, `src/audio.js`, `src/art.js` | Souris/doigt/clavier, sons, visuels peints. |

Téléphone : devicePixelRatio plafonné à 2, ordre des cases, reflets, scores et aperçu mis en cache
(recalculés seulement quand l'île change), halo flouté calculé une fois, boucle d'affichage arrêtée quand l'onglet est caché.

## Visuels

Les 7 visuels du dossier `art/` ont été peints avec Codex (prompts dans `tools/art/prompts.json`) :
le tableau de l'île sous l'accueil et les 6 cartes de bâtiments (main et règles). Les bâtiments
posés sur l'île restent dessinés en isométrique, pour garder leurs fenêtres qui s'allument la nuit.
Si une image manque, le jeu retombe sur le dessin d'origine.

## Sauvegarde

Clé `kevopolis.sauvegarde` dans le navigateur, version 2 :
`{ version, muted, best: { île: habitants }, days: { AAAA-MM-JJ: habitants }, games }` (400 îles et 120 jours au plus).
Tout changement de format incrémente `SAVE_VERSION` et ajoute une étape à `MIGRATIONS` (la v1 → v2 retrouve
les jours joués dans les records de l'île du jour ; l'original est gardé sous `kevopolis.sauvegarde.v1`).
Une sauvegarde abîmée ou d'une version plus récente est mise de côté sous `kevopolis.sauvegarde.abimee`, jamais écrasée.
L'ancien format (`kevo-mute` et `kevo-best-<île>`) est repris automatiquement une fois, puis effacé.

## Tests

```bash
npm ci
npx playwright install chromium
npm test            # types + unitaires + fumée + partie complète ; captures dans test-results/
```

- `npm run unit` (94 tests) : score de chaque bâtiment et ses cas limites (bords, lagon, diagonales, bois), les 14 vœux
  au seuil et juste en dessous, chaque forme d'île (taille, d'un seul tenant, bois, sac), l'île d'origine inchangée,
  les 12 îles de l'archipel (valides, jouables, calibrées, ouverture), l'île du jour (date locale, série, semaine),
  la partie (poser, nouvelle main, annuler, minuit, meilleur coup), le bilan de fin, la sauvegarde (v1 → v2, abîmée,
  trop récente, stockage plein ou bloqué, 300 textes au hasard), et des garde-fous de structure (fichiers < 400 lignes).
- `npm run smoke` : le jeu joue tout seul sur ordinateur, iPhone SE et Pixel 7 couché ; échoue sur toute erreur console, un bouton hors écran, une page qui déborde ou une chute d'images/s.
- `npm run partie` (33 vérifications) : l'île du jour jouée jusqu'à minuit en vrais clics, écran de fin complet, record et son retrouvés après rechargement, une île de l'archipel puis l'île suivante, boucle arrêtée onglet caché, ancien format, sauvegarde abîmée ; puis l'archipel et une partie au doigt sur iPhone SE.

La CI GitHub (`.github/workflows/tests.yml`) lance tout sur chaque PR et bloque en cas d'échec. GitHub Pages publie directement la branche `main` (fichier `.nojekyll`).
