#!/usr/bin/env node
/*
 * Genera el código JS de WHOLESALE_CATALOG a partir de
 * scripts/stock-mayorista.json (la salida de actualizar-stock-mayorista.js).
 *
 * Solo regenera los 21 modelos que ya están en el sitio (lista EXISTING
 * abajo) — a pedido, NO agrega modelos nuevos que aparezcan en el
 * proveedor aunque el scrape los traiga.
 *
 * Corré primero:  node scripts/actualizar-stock-mayorista.js
 * Después:        node scripts/generar-catalogo-mayorista.js > scripts/wholesale-catalog.txt
 *
 * El resultado (scripts/wholesale-catalog.txt) es el bloque de JS que
 * reemplaza el array WHOLESALE_CATALOG en index.html.
 */
const fs = require('fs');
const path = require('path');

const data = require('./stock-mayorista.json');

// Modelos que YA existen en el sitio -> nombre del grupo scrapeado del que
// se toman los sabores. Mantiene el nombre/puffs/foto ya cargados en el
// sitio (no se tocan) y solo actualiza sabores + precio.
const EXISTING = [
  { siteName: 'ELFBAR 40K ICE KING', puffs: 40000, photo: 'ice_king', scraped: 'ELFBAR 40K ICE KING' },
  { siteName: 'IGNITE VMIX 40K', puffs: 40000, photo: 'vmix', scraped: 'IGNITE VMIX 40K' },
  { siteName: 'ELFBAR 40K TRIO', puffs: 40000, photo: 'trio', scraped: 'ELFBAR 40K TRIO' },
  { siteName: 'IGNITE V500', puffs: 50000, photo: 'v500', scraped: 'IGNITE V500' },
  { siteName: 'ELFBAR DUKE 35K', puffs: 35000, photo: 'duke', scraped: 'ELFBAR DUKE 35K' },
  { siteName: 'BLACKSHEEP 40K', puffs: 40000, photo: 'blacksheep', scraped: 'BLACK SHEEP 40K SWITCH' },
  { siteName: 'EBCREATE BC PRO', puffs: 40000, photo: 'ebcreate', scraped: 'EBCREATE BC PRO 40K' },
  { siteName: 'IGNITE V400 ICE', puffs: 40000, photo: 'v400', scraped: 'IGNITE V400 ICY' },
  { siteName: 'ELFBAR BC 15K', puffs: 15000, photo: 'bc', scraped: 'ELFBAR BC 15K' },
  { siteName: 'IGNITE V300 ULTRA SLIM', puffs: 30000, photo: 'wholesale_v300_ultra_slim', scraped: 'IGNITE V300 ULTRA SLIM' },
  { siteName: 'IGNITE V150 PRO', puffs: 15000, photo: 'v150', scraped: 'IGNITE V150 PRO' },
  { siteName: 'NIKBAR 10000', puffs: 10000, photo: 'nikbar10', scraped: 'NIKBAR 10000' },
  { siteName: 'ELFBAR 40K SWEET KING', puffs: 40000, photo: 'sweet_king', scraped: 'ELFBAR 40K SWEET KING' },
  { siteName: 'IGNITE V300', puffs: 30000, photo: 'wholesale_v300', scraped: 'IGNITE V300 BLACK' },
  { siteName: 'NIKBAR 30000', puffs: 30000, photo: 'nikbar30', scraped: 'NIKBAR 30000' },
  { siteName: 'BLACKSHEEP 55K', puffs: 55000, photo: 'blacksheep_55k', scraped: 'BLACKSHEEP 55K' },
  { siteName: 'BLVK JUST JUICE', puffs: 45000, photo: 'blvk', scraped: 'BLVK JUST JUICE 45K' },
  { siteName: 'LOST MARY DURA 35000', puffs: 35000, photo: 'lost_mary_dura_35000', scraped: 'LOST MARY DURA 35000' },
  { siteName: 'LOST MARY MT20.000', puffs: 20000, photo: 'lost_mary_mt20000', scraped: 'LOST MARY MT20.000' },
  { siteName: 'ELFBAR GH 23000', puffs: 23000, photo: 'elfbar_gh_23000', scraped: 'ELFBAR GH 23000' },
  { siteName: 'ELFBAR DISP TE30K', puffs: 30000, photo: 'elfbar_disp_te30k', scraped: 'ELFBAR DISP TE30K 5%' },
];


const EMOJI_RULES = [
  [/STRAWBERRY|STRAW\b/, '🍓'], [/GRAPE/, '🍇'], [/MANGO/, '🥭'], [/WATERMELON|SANDIA/, '🍉'],
  [/BANANA|NANA\b/, '🍌'], [/PINEAPPLE|PINA/, '🍍'], [/PEACH/, '🍑'], [/CHERRY/, '🍒'],
  [/BLUEBERRY|BLUERAZZ|BLUE RAZZ/, '🫐'], [/KIWI/, '🥝'], [/APPLE/, '🍏'], [/LEMON/, '🍋'],
  [/LIME/, '🍈'], [/ORANGE/, '🍊'], [/COCONUT/, '🥥'], [/DRAGON/, '🐉'], [/BUBBLEGUM|BUBBLE\b|B-POP|BBG/, '🍬'],
  [/COLA/, '🥤'], [/ENERGY|MONSTER/, '⚡'], [/MINT|MENTHOL|ICY|ICE\b|FREEZE|FROST|FROZEN|POLAR|WINTERGREEN|WINTER/, '❄️'],
  [/PASSION|MARACUYA/, '🐠'], [/GUAVA/, '🍈'], [/MELON/, '🍈'], [/POME|GRANATE/, '🌺'],
  [/RASPBERRY/, '🍇'], [/BLACKBERRY/, '🫐'], [/COFFEE|CAPUCCINO|MOCHA|ESPRESSO/, '☕'],
  [/VANILLA|CREAM|CUSTARD/, '🍦'], [/LYCHEE/, '🍈'], [/HONEYDEW/, '🍈'], [/SODA/, '🥤'],
  [/BERRY|BERRIES/, '🫐'], [/SPLASH/, '🌊'], [/TUTTI|FRUTTI/, '🍭'], [/TROPICAL/, '🌴'],
  [/SOUR/, '🍋'], [/GUM\b|GUMMY/, '🍬'], [/TIGER/, '🐯'], [/LOVE/, '💕'], [/BLAST|TWIST/, '💥'],
];
function emojiFor(flavorUpper) {
  const found = [];
  for (const [re, emo] of EMOJI_RULES) {
    if (re.test(flavorUpper) && !found.includes(emo)) found.push(emo);
    if (found.length >= 2) break;
  }
  return found.join('');
}

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|[\s/+.-])([a-záéíóúñ])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function mostCommonPrice(sabores) {
  const counts = new Map();
  for (const s of sabores) {
    const n = parseFloat(String(s.precio).replace(',', '.'));
    if (Number.isNaN(n)) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  let best = null, bestCount = -1;
  for (const [price, count] of counts) {
    if (count > bestCount) { best = price; bestCount = count; }
  }
  return best;
}

// Los sabores agotados no se muestran en el sitio (a pedido: el cliente no
// tiene que enterarse de qué hay o no hay en stock), así que ni siquiera
// entran al array — se filtran directamente acá, antes de generar el código.
function buildFlavorsCode(sabores) {
  const items = sabores
    .filter((s) => s.estado === 'En stock')
    .map((s) => {
      const nice = titleCase(s.sabor);
      const emo = emojiFor(s.sabor.toUpperCase());
      return `{name:'${(nice + (emo ? ' ' + emo : '')).replace(/'/g, "\\'")}', stock:20}`;
    });
  return `[${items.join(',')}]`;
}

function findGroup(scrapedName) {
  return data.find((g) => g.modelo === scrapedName);
}

const usedScrapedNames = new Set();
const lines = [];

lines.push('const WHOLESALE_CATALOG = [');

for (const e of EXISTING) {
  const group = findGroup(e.scraped);
  if (!group) {
    lines.push(`  // ⚠️ NO ENCONTRADO en el scrape: "${e.scraped}" (revisar, se mantuvo sin cambios en index.html)`);
    continue;
  }
  usedScrapedNames.add(e.scraped);
  const cost = mostCommonPrice(group.sabores);
  lines.push(
    `  {name:'${e.siteName}', price:wholesalePrice(${cost}), puffs:${e.puffs}, photo:'${e.photo}', flavors:${buildFlavorsCode(group.sabores)}},`
  );
}

lines.push('];');

fs.writeFileSync(path.join(__dirname, 'wholesale-catalog.txt'), lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
