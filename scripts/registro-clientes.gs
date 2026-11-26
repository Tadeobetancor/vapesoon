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
 *  4. Botón azul "Implementar" → "Nueva implementación".
 *       - Tipo (engranaje): "Aplicación web"
 *       - Ejecutar como: "Yo"
 *       - Quién tiene acceso: "Cualquier persona"
 *     → Implementar → Autorizar acceso (elegí tu cuenta → "Configuración
 *       avanzada" → "Ir a ... (no seguro)" → Permitir. Es tu propio script).
 *  5. Copiá la "URL de la aplicación web" (termina en /exec) y pegala en
 *     index.html, en:  const CLIENTES_SHEET_URL = '...';
 *
 * Listo: la pestaña "Clientes" se crea sola con la primera cuenta.
 * La columna "WhatsApp" trae un link para escribirle directo a cada cliente.
 * La columna "Compras" suma 1 por cada pedido que el cliente manda por WhatsApp
 * (es la que llena su barra de premio). Si un pedido no se concretó, restale 1 a mano.
 *
 * Al "Ingresar" desde otro celular sólo se devuelve el nombre y la
 * localidad, nunca la dirección: así nadie puede averiguar la dirección de
 * un cliente tipeando su número. La dirección se vuelve a guardar sola en
 * su primer envío desde ese celular.
 *
 * Si algún día cambiás este código: Implementar → Gestionar implementaciones
 * → lápiz → Versión: "Nueva versión" → Implementar (la URL no cambia).
 */

const SHEET_NAME = 'Clientes';
const HEADERS = ['Fecha de alta', 'Nombre', 'Celular', 'Localidad', 'Dirección',
                 'Compras', 'Último pedido', 'Última actualización', 'WhatsApp'];
const COL = { nombre: 2, celular: 3, localidad: 4, direccion: 5, pedidos: 6, ultimoPedido: 7, actualizado: 8 };

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
        sh.appendRow([now, clean_(d.name), "'" + phone, clean_(d.locality), clean_(d.address),
                      0, '', now, waLink_(phone)]);
        return json_({ ok: true });
      }
      case 'ingreso': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        const v = sh.getRange(row, 1, 1, COL.pedidos).getValues()[0];
        return json_({ ok: true, cliente: {
          name: String(v[COL.nombre - 1]),
          locality: String(v[COL.localidad - 1]),
          orders: Number(v[COL.pedidos - 1]) || 0
        }});
      }
      case 'cambio': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        sh.getRange(row, COL.localidad, 1, 2).setValues([[clean_(d.locality), clean_(d.address)]]);
        sh.getRange(row, COL.actualizado).setValue(now);
        return json_({ ok: true });
      }
      case 'pedido': {
        if (!row) return json_({ ok: false, error: 'nocliente' });
        const cell = sh.getRange(row, COL.pedidos);
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

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#164a83').setFontColor('#ffffff');
  }
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

// Link para escribirle por WhatsApp (celulares argentinos: 54 9 + área + número).
function waLink_(phone) {
  return '=HYPERLINK("https://wa.me/549' + phone + '","Escribir")';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
