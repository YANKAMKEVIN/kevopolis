// Partie complète dans un vrai navigateur (Chromium), jouée en vrais clics comme un joueur :
// accueil -> île du jour -> 18 bâtiments posés (choix de la carte puis clic sur la case), une nouvelle main,
// un coup annulé -> minuit -> écran de fin -> record sauvegardé -> rechargement -> record retrouvé ->
// son coupé retenu -> ancien format repris -> sauvegarde abîmée mise de côté. Puis une partie au doigt sur iPhone SE.
// Lancer : npm run partie
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdirSync } from 'node:fs';

const PORT = await new Promise(res => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const URL = `http://127.0.0.1:${PORT}/index.html`;
const OUT = process.env.SMOKE_SHOTS || 'test-results';
const KEY = 'kevopolis.sauvegarde';
mkdirSync(OUT, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 100; i++) {
  const ok = await new Promise(res => { const c = connect(PORT, '127.0.0.1', () => { c.end(); res(true); }); c.on('error', () => res(false)); });
  if (ok) break; await sleep(100);
}
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); };

/** Joue jusqu'à minuit : à chaque heure, la meilleure carte et la meilleure case, en vrais clics ou touchers. */
async function play(page, touch) {
  let coups = 0, ratés = 0;
  for (let guard = 0; guard < 40; guard++) {
    const mv = await page.evaluate(() => {
      const k = __kevo, G = k.G; if (!G || k.hour >= 24) return null; let best = null;
      k.hand.forEach((t, h) => { if (!t) return; G.cells.forEach((c, i) => { if (!c.land || c.type) return; c.type = t; const s = k.fullScore(G); c.type = null; if (!best || s > best.s) best = { s, h, i }; }); });
      if (!best) return null; const N = Math.sqrt(G.cells.length), x = best.i % N, y = (best.i / N) | 0;
      const { OX, OY, TW, TH } = k.geo; return { ...best, mx: OX + (x - y) * TW / 2, my: OY + (x + y + 1) * TH / 2, hour: k.hour };
    });
    if (!mv) break;
    const card = page.locator(`#hand > *:nth-child(${mv.h + 1})`);
    if (touch) await card.tap(); else await card.click();
    if (touch) { await page.touchscreen.tap(mv.mx, mv.my); await sleep(150); await page.touchscreen.tap(mv.mx, mv.my); } else await page.mouse.click(mv.mx, mv.my);
    await sleep(120);
    if (await page.evaluate(() => __kevo.hour) === mv.hour) { ratés++; break; }
    coups++;
  }
  return { coups, ratés };
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

  await page.goto(URL);
  check(/^v\d+\.\d+\.\d+$/.test(await page.locator('#ver').innerText()), 'numéro de version sur l\'accueil');
  await page.click('#playDaily');
  const seed = await page.evaluate(() => __kevo.G.seedStr);
  check(/^jour-\d{4}-\d{2}-\d{2}$/.test(seed), `île du jour (${seed})`);

  // une nouvelle main, puis un coup annulé
  await page.click('#reroll');
  check(await page.evaluate(() => __kevo.hour) === 7, 'nouvelle main : une heure passe');
  await page.click('#undo');
  check(await page.evaluate(() => __kevo.hour) === 6, 'annuler : retour à 6 h');

  const r = await play(page, false);
  check(r.ratés === 0 && r.coups === 18, `18 bâtiments posés en vrais clics (${r.coups}, ${r.ratés} raté)`);
  await page.screenshot({ path: `${OUT}/partie-1-minuit.png` });
  await page.waitForSelector('#end:not(.hide)', { timeout: 6000 });
  const score = +(await page.locator('#endScore').innerText());
  check(score >= 40, `écran de fin : ${score} habitants, au moins une étoile`);
  await page.screenshot({ path: `${OUT}/partie-2-fin.png` });
  let d = await save();
  check(d?.version === 1 && d.best?.[seed] === score, 'record de l\'île sauvegardé, version 1');

  await page.click('#again');
  await page.click('#snd');
  check((await save())?.muted === true, 'son coupé sauvegardé');
  await page.reload();
  check(await page.evaluate(() => getComputedStyle(document.getElementById('snd')).opacity) === '0.4', 'après rechargement : son toujours coupé');
  await page.click('#playDaily');
  await play(page, false);
  await page.waitForSelector('#end:not(.hide)', { timeout: 6000 });
  check((await page.locator('#endBest').innerText()).includes(String(score)), `après rechargement : record de l'île retrouvé (« ${await page.locator('#endBest').innerText()} »)`);

  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('kevo-best-' + s, '99'); localStorage.setItem('kevo-mute', '0'); }, seed);
  await page.reload();
  check((await save())?.best?.[seed] === 99, 'ancien record (format d\'avant) repris');
  check(await page.evaluate(() => localStorage.getItem('kevo-mute') === null), 'anciennes clés nettoyées');

  await page.evaluate(k => localStorage.setItem(k, '{abîmée'), KEY);
  await page.reload();
  await page.click('#playDaily');
  check(await page.evaluate(k => localStorage.getItem(k + '.abimee'), KEY) === '{abîmée', 'sauvegarde abîmée mise de côté, le jeu démarre');
  check(errors.length === 0, `aucune erreur console${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
  await page.close();

  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const ph = await ctx.newPage(); const perr = []; ph.on('pageerror', e => perr.push(String(e)));
  await ph.goto(URL); await ph.tap('#playRandom');
  const m = await play(ph, true);
  await ph.waitForSelector('#end:not(.hide)', { timeout: 6000 }).catch(() => {});
  await ph.screenshot({ path: `${OUT}/partie-3-iphone-se.png` });
  check(m.coups === 18 && await ph.locator('#end:not(.hide)').count() === 1, `iPhone SE au doigt : partie complète (${m.coups} bâtiments)`);
  check(perr.length === 0, 'iPhone SE : aucune erreur');
} finally { await browser.close(); server.kill(); }
console.log(fails.length ? `\n${fails.length} échec(s).` : '\nPartie complète réussie.');
process.exit(fails.length ? 1 : 0);
