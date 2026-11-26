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

Tout tient dans un seul fichier : ouvre `index.html` dans un navigateur.

## Tests
Un test de fumée joue le jeu tout seul sur ordinateur, iPhone SE et Pixel 7 couché (Chromium) : il échoue sur toute erreur console, un bouton hors de l'écran impossible à atteindre, une page qui déborde ou une chute d'images/s.

```bash
npm install
npx playwright install chromium
npm test            # captures dans test-results/
```
Réglages propres au jeu : `tests/smoke.config.mjs`. La CI GitHub (`.github/workflows/tests.yml`) le lance sur chaque PR.
