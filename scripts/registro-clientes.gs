/**
 * BASE DE DATOS DE CLIENTES (gratis) — Google Sheets + Apps Script
 * =================================================================
 * Cada vez que alguien crea su cuenta, pide con envío, la borra o arma un
 * pedido desde la página, se anota en una planilla de Google tuya. También
 * permite "Ingresar" con el WhatsApp desde cualquier celular.
 *
 * CÓMO ACTIVARLO (una sola vez, ~5 minutos, desde la compu):
 *  1. Entrá a https://sheets.new (crea una planilla nueva en tu Google Drive).
 *     Ponele de nombre "Clientes Vapesoon".
 *  2. Menú Extensiones → Apps Script.
 *  3. Borrá lo que aparece, pegá TODO este archivo y guardá (disquete).
 *  4. Arriba, al lado de "Ejecutar", elegí la función "prepararPlanilla" y
 *     tocá ▶ Ejecutar (te va a pedir permiso: elegí tu cuenta → "Configuración
 *     avanzada" → "Ir a ... (no seguro)" → Permitir. Es tu propio script).
 *     Eso arma las pestañas "Resumen" y "Clientes" con colores y formato.
 *  5. Botón azul "Implementar" → "Nueva implementación".
 *       - Tipo (engranaje): "Aplicación web"
 *       - Ejecutar como: "Yo"
 *       - Quién tiene acceso: "Cualquier persona"
 *     → Implementar.
 *  6. Copiá la "URL de la aplicación web" (termina en /exec) y pegala en
 *     index.html, en:  const CLIENTES_SHEET_URL = '...';
 *
 * Al "Ingresar" desde otro celular sólo se devuelve el nombre, la localidad y
 * las compras, nunca la dirección: así nadie puede averiguar la dirección de
 * un cliente tipeando su número.
 *
 * Si algún día cambiás este código: Implementar → Gestionar implementaciones
 * → lápiz → Versión: "Nueva versión" → Implementar (la URL no cambia).
 */

const SHEET_NAME = 'Clientes';
const SUMMARY_NAME = 'Resumen';
const PREMIO_CADA = 5;      // cada cuántas compras hay premio (igual que LOYALTY_EVERY en la página)
const PREMIO_OFF = 20;      // % de descuento del premio (igual que LOYALTY_OFF en la página)

const HEADERS = ['📅 Alta', '👤 Nombre', '📱 Celular', '📍 Localidad', '🏠 Dirección',
                 '🛒 Compras', '🎁 Premio', '🕒 Último pedido', '💬 WhatsApp'];
const COL = { alta: 1, nombre: 2, celular: 3, localidad: 4, direccion: 5, compras: 6, premio: 7, ultimoPedido: 8, whatsapp: 9 };
const WIDTHS = [110, 170, 140, 150, 240, 95, 260, 140, 110];

// Colores de la marca
const AZUL = '#164a83', AZUL_OSCURO = '#0c315d', CELESTE = '#eaf3ff', DORADO = '#ffe08a';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const phone = normalizePhone_(d.phone);
    if (!phone) return json_({ ok: false, error: 'datos' });

    const sh = sheet_();
    const row = findRow_(sh, phone);
    const now = new Date();

    switch (d.accion) {
      case 'alta': {
        if (row) return json_({ ok: false, error: 'existe' });
        sh.appendRow([now, clean_(d.name), formatPhone_(phone), clean_(d.locality) || 'Retiro',
                      clean_(d.address), 0, '', '', waLink_(phone)]);
        setPremioFormula_(sh, sh.getLastRow());
        return json_({ ok: true });
      }
      case 'ingreso': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        const v = sh.getRange(row, 1, 1, COL.compras).getValues()[0];
        const loc = String(v[COL.localidad - 1]);
        return json_({ ok: true, cliente: {
          name: String(v[COL.nombre - 1]),
          locality: loc === 'Retiro' ? '' : loc,
          orders: Number(v[COL.compras - 1]) || 0
        }});
      }
      case 'cambio': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        sh.getRange(row, COL.localidad, 1, 2).setValues([[clean_(d.locality) || 'Retiro', clean_(d.address)]]);
        return json_({ ok: true });
      }
      case 'pedido': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        const cell = sh.getRange(row, COL.compras);
        cell.setValue((Number(cell.getValue()) || 0) + 1);
        sh.getRange(row, COL.ultimoPedido).setValue(now);
        return json_({ ok: true });
      }
      case 'baja': {
        if (row) sh.deleteRow(row);
        return json_({ ok: true });
      }
    }
    return json_({ ok: false, error: 'accion' });
  } catch (err) {
    return json_({ ok: false, error: 'servidor' });
  } finally {
    lock.releaseLock();
  }
}

// Para probar que está vivo: abrir la URL /exec en el navegador.
function doGet() { return ContentService.createTextOutput('Vapesoon clientes: funcionando'); }

/* ================= Planilla prolija ================= */

// Se ejecuta a mano desde el editor (paso 4). También corre sola si la
// pestaña "Clientes" no existe. No borra clientes: sólo arma pestañas y formato.
function prepararPlanilla() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  formatClientes_(sh);
  let res = ss.getSheetByName(SUMMARY_NAME);
  if (!res) res = ss.insertSheet(SUMMARY_NAME, 0);
  formatResumen_(res);
  // fuera la "Hoja 1" vacía que trae toda planilla nueva
  ss.getSheets().forEach(function (s) {
    const n = s.getName();
    if (n !== SHEET_NAME && n !== SUMMARY_NAME && s.getLastRow() === 0) ss.deleteSheet(s);
  });
  ss.setActiveSheet(res);
}

function formatClientes_(sh) {
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sh.setFrozenRows(1);
  sh.setTabColor(AZUL);
  sh.setRowHeight(1, 42);
  WIDTHS.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  const max = sh.getMaxRows();
  sh.getRange(2, 1, max - 1, HEADERS.length).setVerticalAlignment('middle').setFontSize(11);
  sh.getRange(2, COL.alta, max - 1, 1).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  sh.getRange(2, COL.ultimoPedido, max - 1, 1).setNumberFormat('dd/mm/yyyy').setHorizontalAlignment('center');
  sh.getRange(2, COL.celular, max - 1, 1).setHorizontalAlignment('center');
  sh.getRange(2, COL.compras, max - 1, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(2, COL.whatsapp, max - 1, 1).setHorizontalAlignment('center').setFontWeight('bold');

  // filas alternadas (blanco / celeste) con el encabezado en el azul de la marca
  sh.getBandings().forEach(function (b) { b.remove(); });
  sh.getRange(1, 1, max, HEADERS.length)
    .applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false)
    .setHeaderRowColor(AZUL)
    .setFirstRowColor('#ffffff')
    .setSecondRowColor(CELESTE);
  sh.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold').setFontColor('#ffffff').setFontSize(11)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // dorado cuando la próxima compra tiene el premio
  const premio = sh.getRange(2, COL.premio, max - 1, 1);
  sh.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains('OFF')
    .setBackground(DORADO).setFontColor('#7a4b00').setBold(true)
    .setRanges([premio]).build()]);

  // premio para los clientes que ya estén cargados
  for (let r = 2; r <= sh.getLastRow(); r++) setPremioFormula_(sh, r);
}

// "🎁 Próxima compra: 20% OFF" o "Faltan 2 compras para el premio".
function setPremioFormula_(sh, r) {
  const n = PREMIO_CADA, last = PREMIO_CADA - 1;
  const left = '(' + last + '-MOD(RC[-1],' + n + '))';
  sh.getRange(r, COL.premio).setFormulaR1C1(
    '=IF(RC[-1]="","",IF(' + left + '=0,"🎁 Próxima compra: ' + PREMIO_OFF + '% OFF",' +
    'IF(' + left + '=1,"Falta 1 compra","Faltan "&' + left + '&" compras")&" para el premio"))'
  );
}

function formatResumen_(res) {
  res.clear();
  res.setTabColor(AZUL_OSCURO);
  res.setHiddenGridlines(true);
  res.setColumnWidth(1, 30);
  res.setColumnWidth(2, 340);
  res.setColumnWidth(3, 170);

  res.getRange('B2:C2').merge().setValue('VAPESOON · Clientes')
    .setFontSize(22).setFontWeight('bold').setFontColor('#ffffff').setBackground(AZUL_OSCURO)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  res.setRowHeight(2, 56);

  const C = "'" + SHEET_NAME + "'!";
  const stats = [
    ['👤 Clientes registrados', '=COUNTA(' + C + 'B2:B)'],
    ['🛒 Compras en total', '=SUM(' + C + 'F2:F)'],
    ['🎁 Con ' + PREMIO_OFF + '% OFF en la próxima', '=COUNTIF(' + C + 'G2:G,"*OFF*")'],
    ['🆕 Nuevos este mes', '=COUNTIFS(' + C + 'A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1))'],
  ];
  stats.forEach(function (s, i) {
    const r = 4 + i;
    res.getRange(r, 2).setValue(s[0]).setFontSize(13).setFontWeight('bold').setFontColor(AZUL_OSCURO);
    res.getRange(r, 3).setFormula(s[1]).setFontSize(18).setFontWeight('bold').setFontColor(AZUL)
      .setHorizontalAlignment('center');
    res.getRange(r, 2, 1, 2).setBackground(i % 2 ? '#ffffff' : CELESTE).setVerticalAlignment('middle');
    res.setRowHeight(r, 44);
  });
  res.getRange(4, 2, stats.length, 2)
    .setBorder(true, true, true, true, false, true, '#b0d9ff', SpreadsheetApp.BorderStyle.SOLID);

  const tips = [
    'CÓMO USARLA',
    '• Cada cliente que crea su cuenta en la página aparece solo en la pestaña "Clientes".',
    '• "💬 WhatsApp" → tocá "Escribir" para mandarle un mensaje o una promo.',
    '• "🛒 Compras" suma 1 por cada pedido que te manda por WhatsApp. Si un pedido no se concretó, restale 1 a mano.',
    '• "🎁 Premio" se pinta de dorado cuando su próxima compra tiene ' + PREMIO_OFF + '% OFF.',
    '• Para dar de baja a alguien, borrá su fila.',
  ];
  tips.forEach(function (t, i) {
    const r = 10 + i;
    const cell = res.getRange(r, 2, 1, 2).merge().setValue(t)
      .setFontSize(11).setFontColor('#33475b').setWrap(true).setVerticalAlignment('middle');
    res.setRowHeight(r, i === 3 ? 44 : 26);
    if (i === 0) cell.setFontWeight('bold').setFontColor(AZUL).setFontSize(12);
  });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { prepararPlanilla(); sh = ss.getSheetByName(SHEET_NAME); }
  return sh;
}

function findRow_(sh, phone) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const phones = sh.getRange(2, COL.celular, last - 1, 1).getValues();
  for (let i = 0; i < phones.length; i++) {
    if (normalizePhone_(phones[i][0]) === phone) return i + 2;
  }
  return 0;
}

// Evita que alguien meta fórmulas (=, +, -, @) en la planilla.
function clean_(s) {
  return String(s || '').replace(/^[=+\-@\s]+/, '').slice(0, 120);
}

// Cada uno escribe el número distinto (+54, 54 9, 011, 11 15..., 15...):
// se guarda siempre como "área + número", 10 dígitos (ej: 1123456789).
// Es la misma regla que usa la página (normalizePhone en index.html).
function normalizePhone_(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) { d = d.slice(2); if (d.startsWith('9')) d = d.slice(1); }
  if (d.length === 11 && d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    for (const n of [2, 3, 4]) { if (d.substr(n, 2) === '15') { d = d.slice(0, n) + d.slice(n + 2); break; } }
  }
  if (d.length === 10 && d.startsWith('15')) d = '11' + d.slice(2);
  if (d.length === 8) d = '11' + d;
  return d.length === 10 ? d : '';
}

// "11 2345-6789" (igual que se ve en la página)
function formatPhone_(d) {
  return d.startsWith('11') ? '11 ' + d.slice(2, 6) + '-' + d.slice(6) : d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6);
}

// Link para escribirle por WhatsApp (celulares argentinos: 54 9 + área + número).
function waLink_(phone) {
  return '=HYPERLINK("https://wa.me/549' + phone + '","Escribir")';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
