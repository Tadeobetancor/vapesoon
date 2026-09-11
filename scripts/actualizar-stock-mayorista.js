#!/usr/bin/env node
/*
 * Actualizar stock mayorista
 * ==========================
 * Recorre el catálogo de un proveedor (por defecto, italiashop.com.py ->
 * descartables), separa cada producto en Modelo + Sabor, y arma un CSV y
 * un JSON listos para comparar contra el catálogo mayorista propio — sin
 * tener que revisar 17 páginas ni separar nombres a mano.
 *
 * Uso:
 *   node scripts/actualizar-stock-mayorista.js
 *   node scripts/actualizar-stock-mayorista.js https://italiashop.com.py/product-category/otra-categoria/
 *
 * Cómo separa "modelo" de "sabor":
 * Cada producto del proveedor viene como un solo nombre ("ELFBAR 40K ICE
 * KING GRAPE ICE" = modelo "ELFBAR 40K ICE KING" + sabor "GRAPE ICE"), sin
 * ninguna marca explícita de dónde termina uno y empieza el otro. MODEL_
 * PATTERNS de abajo es la lista de modelos conocidos (armada revisando los
 * 612 productos actuales) que le dice al script dónde cortar cada nombre.
 *
 * Si el proveedor agrega una línea de modelo nueva, el script NO va a
 * inventar dónde cortarla — la deja afuera y la anota en la sección
 * "SIN CLASIFICAR" al final (revisar esa lista después de cada corrida:
 * ahí aparece lo nuevo que hay que sumar a MODEL_PATTERNS a mano).
 * También se excluyen automáticamente los productos que no son un sabor
 * real (ej. notas de precio, el dispositivo solo sin cartucho).
 *
 * Salida:
 *   scripts/stock-mayorista.csv   (Modelo, Sabor, Precio, Estado, URL)
 *   scripts/stock-mayorista.json  (agrupado por modelo)
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || 'https://italiashop.com.py/product-category/descartables/';
const CSV_PATH = path.join(__dirname, 'stock-mayorista.csv');
const JSON_PATH = path.join(__dirname, 'stock-mayorista.json');
const REQUEST_DELAY_MS = 500; // pausa entre páginas para no saturar el sitio del proveedor
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/* Orden importante: los modelos más específicos van ANTES que sus propios
 * prefijos más cortos (ej. "IGNITE V300 ULTRA SLIM" antes que "IGNITE
 * V300 BLACK" antes que un genérico "IGNITE V300"), si no el genérico se
 * la come primero y el sabor queda mal cortado. */
const MODEL_PATTERNS = [
  'BLACK SHEEP 40K SWITCH',
  'BLACKSHEEP 25K',
  'BLACKSHEEP 55K',
  'BLVK JUST JUICE 45K',
  'EBCREATE BC PRO 40K',
  'ELFBAR 40K ICE KING',
  'ELFBAR 40K SWEET KING',
  'ELFBAR 40K TRIO',
  'ELFBAR BC 45K PRO',
  'ELFBAR BC 15K',
  'ELFBAR DISP TE30K 5%',
  'ELFBAR DUKE 35K',
  'ELFBAR GH 33K PRO',
  'ELFBAR GH 23000',
  'ELFBAR TE30K',
  'GEEKBAR Z35',
  'IGNITE P100 KIT METALIC GRAY',
  'IGNITE V-NANO',
  'IGNITE V120',
  'IGNITE V150 PRO',
  'IGNITE V150',
  'IGNITE V155 MATTE BLACK',
  'IGNITE V155 ORANGE',
  'IGNITE V250 BLACK',
  'IGNITE V300 ULTRA SLIM',
  'IGNITE V300 BLACK',
  'IGNITE V400 ICY',
  'IGNITE V400 SWEET',
  'IGNITE V500',
  'IGNITE VMIX 40K',
  'LIFE POD ECO II CART 10K',
  'LIFE POD ECO III CART',
  'LIFE POD THE ONE CARBON',
  'LIFE POD THE ONE GRAY',
  'LOST MARY DURA 35000',
  'LOST MARY MT20.000',
  'MASKKING FLAVOR X 50K',
  'MASKKING ICEX 40K',
  'MASKKING MIBO 35K',
  'NIKBAR 10000',
  'NIKBAR 25000',
  'NIKBAR 30000',
  'NIKBAR 40K ICE NIC',
  'NIKBAR 40K T.CHILL',
  'OXBAR 30000 MAGIC MAZE 2',
  'OXBAR 35K ICE+NIC',
  'OXBAR 50K INVIS VAPOR 3IN1',
  'OXBAR X15K',
  'OXBAR X15',
  'SMOK PRIVBAR TU 15K',
  'VAPORESSO DOJO X 40K',
]
  // más largo primero, para que el prefijo específico gane antes que uno genérico más corto
  .sort((a, b) => b.length - a.length)
  .map((model) => ({
    model,
    // "40K"/"40k" tratados igual; el resto de la línea debe ser texto real (el sabor)
    regex: new RegExp('^' + model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/K\b/gi, '[Kk]') + '\\s+(.+)$'),
  }));

/* Nombres que technically "matchean" un modelo pero no son un sabor real
 * (notas internas del proveedor, actualizaciones de precio, etc.) —
 * se excluyen igual que si no hubieran matcheado ningún modelo. */
const NOT_A_FLAVOR = [/PRECIO ACTUALIZADO/i, /^\d+\s*MAH$/i];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageUrl(baseUrl, pageNumber) {
  if (pageNumber <= 1) return baseUrl;
  const trimmed = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  return `${trimmed}page/${pageNumber}/`;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

/* Cuántas páginas tiene la categoría, leyendo la paginación de WooCommerce
 * (<a class="page-numbers" href=".../page/N/">N</a>) de la primera página. */
function detectLastPage(html) {
  const matches = [...html.matchAll(/class="page-numbers"[^>]*>(\d+)</g)];
  if (!matches.length) return 1;
  return Math.max(...matches.map((m) => parseInt(m[1], 10)));
}

/* Cada producto es un <li class="... instock|outofstock ...">, con el
 * nombre, el precio y el link adentro. Se parte el HTML por cada <li> de
 * producto y se leen esos tres datos con regex simples en vez de traer
 * una librería de parseo HTML (no hace falta para algo tan chico). */
function parseProducts(html, pageNumber) {
  const chunks = html.split('<li class="cs-entry product').slice(1);
  return chunks.map((chunk) => {
    const stockMatch = chunk.match(/\b(instock|outofstock)\b/);
    const nameMatch = chunk.match(/woocommerce-loop-product__title"><span>([^<]+)<\/span>/);
    const priceMatch = chunk.match(/amount">([\d.,]+)/);
    const urlMatch = chunk.match(/href="(https:\/\/[^"]+\/product\/[^"]+)"/);
    return {
      pagina: pageNumber,
      nombre: nameMatch ? nameMatch[1].trim() : '(sin nombre)',
      precio: priceMatch ? priceMatch[1] : '',
      estado: stockMatch && stockMatch[1] === 'instock' ? 'En stock' : 'Agotado',
      url: urlMatch ? urlMatch[1] : '',
    };
  });
}

/* Separa "ELFBAR 40K ICE KING GRAPE ICE" en {model, flavor} probando
 * MODEL_PATTERNS en orden. Devuelve null si no matchea ningún modelo
 * conocido, o si lo que queda después del modelo no es un sabor real. */
function splitModelFlavor(nombre) {
  const upper = nombre.toUpperCase();
  for (const { model, regex } of MODEL_PATTERNS) {
    const m = upper.match(regex);
    if (!m) continue;
    const flavor = m[1].trim();
    if (!flavor || NOT_A_FLAVOR.some((re) => re.test(flavor))) return null;
    return { model, flavor };
  }
  return null;
}

function toCsv(rows) {
  const header = ['Modelo', 'Sabor', 'Precio', 'Estado', 'URL'];
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([r.modelo, r.sabor, r.precio, r.estado, r.url].map(escape).join(','));
  }
  return lines.join('\n');
}

function toGroupedJson(rows) {
  const byModel = new Map();
  for (const r of rows) {
    if (!byModel.has(r.modelo)) byModel.set(r.modelo, []);
    byModel.get(r.modelo).push({ sabor: r.sabor, precio: r.precio, estado: r.estado, url: r.url });
  }
  return [...byModel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([modelo, sabores]) => ({ modelo, sabores }));
}

async function main() {
  console.log(`Consultando ${BASE_URL} ...`);
  const firstPageHtml = await fetchHtml(BASE_URL);
  const lastPage = detectLastPage(firstPageHtml);
  console.log(`Detecté ${lastPage} página(s).`);

  let allProducts = parseProducts(firstPageHtml, 1);

  for (let page = 2; page <= lastPage; page++) {
    await sleep(REQUEST_DELAY_MS);
    const url = pageUrl(BASE_URL, page);
    process.stdout.write(`  página ${page}/${lastPage}...`);
    try {
      const html = await fetchHtml(url);
      const products = parseProducts(html, page);
      allProducts = allProducts.concat(products);
      console.log(` ${products.length} productos`);
    } catch (err) {
      console.log(` ERROR (${err.message}) — se saltea esta página`);
    }
  }

  const rows = [];
  const sinClasificar = [];
  for (const p of allProducts) {
    const split = splitModelFlavor(p.nombre);
    if (!split) {
      sinClasificar.push(p.nombre);
      continue;
    }
    rows.push({ modelo: split.model, sabor: split.flavor, precio: p.precio, estado: p.estado, url: p.url });
  }
  rows.sort((a, b) => a.modelo.localeCompare(b.modelo) || a.sabor.localeCompare(b.sabor));

  fs.writeFileSync(CSV_PATH, toCsv(rows), 'utf8');
  fs.writeFileSync(JSON_PATH, JSON.stringify(toGroupedJson(rows), null, 2), 'utf8');

  const enStock = rows.filter((r) => r.estado === 'En stock').length;
  console.log('');
  console.log(`Total scrapeado: ${allProducts.length} productos`);
  console.log(`Clasificados: ${rows.length} (${enStock} en stock, ${rows.length - enStock} agotados)`);
  console.log(`Excluidos / sin clasificar: ${sinClasificar.length}`);
  if (sinClasificar.length) {
    console.log('  -> ' + sinClasificar.join('\n  -> '));
  }
  console.log('');
  console.log(`Guardado: ${CSV_PATH}`);
  console.log(`Guardado: ${JSON_PATH}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
