// @ts-check
/** Types partagés du jeu (aucun code exécuté : importés par `import('./types.js').Nom`). */

/** Un bâtiment que l'on peut poser.
 * @typedef {'maison'|'parc'|'boutique'|'atelier'|'place'|'phare'} Kind */
/** Ce qui peut occuper une case : un bâtiment ou un bois d'origine.
 * @typedef {Kind|'bois'} Tile */
/** Une case de l'île : terre ou mer, ce qui y est posé (null si vide), heure de pose (animation).
 * @typedef {{land:boolean,type:Tile|null,born:number}} Cell */
/** Seuils des trois étoiles, croissants.
 * @typedef {readonly [number,number,number]} Stars */
/** L'île en cours : 7×7 cases, graine, sac de cartes restant, trois vœux, forme, seuils d'étoiles.
 * @typedef {{cells:Cell[],seedStr:string,bag:Kind[],goals:string[],shape:string,stars:Stars}} Island */
/** Ce qu'il faut pour annuler un coup.
 * @typedef {{cells:Cell[],hand:(Kind|null)[],bag:Kind[],hour:number,rerolls:number,sel:number,bestMove:Move|null}} Snapshot */
/** Le meilleur coup de la partie (pour l'écran de fin).
 * @typedef {{type:Kind,d:number,hour:number}} Move */
/** Ce que l'on joue : île du jour, île au hasard ou île de l'archipel.
 * @typedef {'jour'|'hasard'|'archipel'} Mode */
/** Comment fabriquer une partie : la graine, le nom affiché, le mode et, pour l'archipel, l'île.
 * @typedef {{seed:string,label:string,mode:Mode,level?:string}} GameSpec */
/** Un vœu : identifiant, texte, test sur l'île.
 * @typedef {{id:string,txt:string,test:(g:Island)=>boolean}} Goal */

export {};
