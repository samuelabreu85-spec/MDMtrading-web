/* =====================================================================================
   MDM Móvil — relay + web app para el móvil (mdmtrading.net/m/)
   -------------------------------------------------------------------------------------
   El servidor NO guarda nada: junta en memoria el Core de NinjaTrader (en el PC del
   alumno) con su móvil y les pasa los mensajes. Si se reinicia, los dos se vuelven a
   conectar solos.

     Core (NinjaTrader) ──wss──▶  /m/ws  ◀──wss── Móvil (PWA en /m/)

   Uso en el servidor Express (2 líneas):
       const server = app.listen(PORT, ...);
       require('./mobile')(app, server);

   Variables de entorno para los avisos push (genéralas una vez con
   `node mobile/vapid.js` y pégalas en Railway → Variables):
       VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo)
   Sin ellas todo funciona menos los avisos push.
   ===================================================================================== */
'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer } = require('ws');
let webpush = null;
try { webpush = require('web-push'); } catch (e) { webpush = null; }

const CH_RE = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_MSG = 512 * 1024;
const MAX_PHONES = 5;
const PHONE_CMDS = new Set(['flatten', 'cancelOrders', 'shield', 'manualLock', 'copyOn']);
const PUSH_KINDS = {
  lock: 'Cuenta bloqueada', unlock: 'Cuenta desbloqueada', closeFail: 'Revisa la posición',
  blind: 'Escudo sin datos', blocked: 'Orden cancelada', copyWarn: 'Copiador'
};
const FF_URL = process.env.MDM_FF_URL || 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

module.exports = function attach(app, server, opts) {
  opts = opts || {};
  const base = opts.base || '/m';
  const log = opts.log || ((...a) => console.log('[MDM móvil]', ...a));

  /* ── push ─────────────────────────────────────────────────────────────── */
  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
  const pushOn = !!(webpush && VAPID_PUBLIC && VAPID_PRIVATE);
  if (pushOn) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:soporte@mdmtrading.net', VAPID_PUBLIC, VAPID_PRIVATE);
  else log('avisos push desactivados (faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');

  /* ── canales en memoria ───────────────────────────────────────────────── */
  // ch -> { keyHash, core, phones:Set, last, lastAt, subs:Map(endpoint -> sub) }
  const channels = new Map();
  const getCh = ch => {
    let c = channels.get(ch);
    if (!c) { c = { keyHash: null, core: null, phones: new Set(), last: null, lastAt: 0, subs: new Map() }; channels.set(ch, c); }
    return c;
  };
  const send = (ws, obj) => { try { if (ws && ws.readyState === 1) ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch (e) {} };
  const toPhones = (c, obj) => { const s = typeof obj === 'string' ? obj : JSON.stringify(obj); c.phones.forEach(p => send(p, s)); };
  const phoneStatus = c => toPhones(c, { t: 'status', core: !!(c.core && c.core.readyState === 1) });
  const tellCorePhones = c => send(c.core, { t: 'phones', n: c.phones.size });
  const cleanup = ch => {
    const c = channels.get(ch);
    if (c && !c.core && c.phones.size === 0) channels.delete(ch);
  };

  /* ── HTTP: web app + calendario ───────────────────────────────────────── */
  const router = express.Router();
  router.get('/api/vapid', (req, res) => res.json({ key: pushOn ? VAPID_PUBLIC : null }));

  let cal = { at: 0, xml: null, err: null, pending: null };
  async function loadCalendar() {
    if (cal.xml && Date.now() - cal.at < 15 * 60e3) return cal;
    if (cal.pending) return cal.pending;
    cal.pending = (async () => {
      try {
        const r = await fetch(FF_URL, { headers: { 'User-Agent': 'Mozilla/5.0 MDM' }, signal: AbortSignal.timeout(12000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const t = await r.text();
        if (!t.includes('<event>')) throw new Error('respuesta vacía');
        cal.xml = t; cal.at = Date.now(); cal.err = null;
      } catch (e) {
        cal.err = String(e.message || e);
        if (cal.xml) cal.at = Date.now() - 10 * 60e3; // reintenta en 5 min con lo que había
      } finally { cal.pending = null; }
      return cal;
    })();
    return cal.pending;
  }
  function parseCalendar(xml) {
    const out = [];
    const tag = (s, n) => { const m = s.match(new RegExp('<' + n + '>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + n + '>')); return m ? m[1].trim() : ''; };
    (xml.match(/<event>[\s\S]*?<\/event>/g) || []).forEach(e => {
      if (tag(e, 'country') !== 'USD') return;
      const impact = tag(e, 'impact').toLowerCase();
      if (impact !== 'high' && impact !== 'medium') return;
      const d = tag(e, 'date').match(/(\d{2})-(\d{2})-(\d{4})/);
      const time = tag(e, 'time');
      let ts = null, day = null;
      if (d) {
        day = d[3] + '-' + d[1] + '-' + d[2];
        const m = time.match(/(\d+):(\d+)\s*(am|pm)?/i);
        if (m) {
          let h = +m[1]; const mi = +m[2];
          if (m[3] && m[3].toLowerCase() === 'pm' && h < 12) h += 12;
          if (m[3] && m[3].toLowerCase() === 'am' && h === 12) h = 0;
          ts = Date.UTC(+d[3], +d[1] - 1, +d[2], h, mi, 0);
        }
      }
      out.push({ title: tag(e, 'title'), impact, day, ts, timeText: ts ? null : time,
        forecast: tag(e, 'forecast'), previous: tag(e, 'previous'), actual: tag(e, 'actual') });
    });
    return out;
  }
  router.get('/api/calendar', async (req, res) => {
    const c = await loadCalendar();
    if (!c.xml) return res.status(503).json({ ok: false, error: c.err || 'sin datos' });
    res.set('Cache-Control', 'public, max-age=120');
    res.json({ ok: true, at: c.at, events: parseCalendar(c.xml) });
  });

  router.use(express.static(path.join(__dirname, 'public'), {
    setHeaders(res, p) {
      if (p.endsWith('sw.js') || p.endsWith('.html') || p.endsWith('.webmanifest')) res.set('Cache-Control', 'no-cache');
    }
  }));
  app.use(base, router);

  /* ── WebSocket ────────────────────────────────────────────────────────── */
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG });
  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try { pathname = new URL(req.url, 'http://x').pathname; } catch (e) {}
    if (pathname !== base + '/ws') return; // no es nuestro: lo dejamos para otros handlers
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });

  wss.on('connection', ws => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.role = null; ws.ch = null;
    const helloTimer = setTimeout(() => { if (!ws.role) ws.close(4000, 'sin saludo'); }, 10000);
    let cmdTimes = [];

    ws.on('message', raw => {
      let m;
      try { m = JSON.parse(raw.toString()); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;

      /* saludo */
      if (!ws.role) {
        if (m.t !== 'hello' || !CH_RE.test(String(m.ch || '')) || String(m.key || '').length < 24) return ws.close(4001, 'saludo no válido');
        clearTimeout(helloTimer);
        const c = getCh(m.ch);
        const kh = sha(m.key);
        ws.ch = m.ch; ws.keyHash = kh;

        if (m.role === 'core') {
          if (c.core && c.core !== ws) { try { c.core.close(4002, 'otro Core en este canal'); } catch (e) {} }
          c.core = ws; ws.role = 'core';
          if (c.keyHash && !safeEq(c.keyHash, kh)) c.subs.clear();
          c.keyHash = kh;
          c.subs.clear();
          (Array.isArray(m.subs) ? m.subs : []).slice(0, 10).forEach(s => {
            if (s && s.endpoint && s.p256dh && s.auth) c.subs.set(s.endpoint, s);
          });
          // móviles que esperaban con otra clave: fuera
          c.phones.forEach(p => { if (!safeEq(p.keyHash, kh)) { send(p, { t: 'error', msg: 'Vinculación caducada. Vuelve a escanear el QR desde el PC.' }); p.close(4003, 'clave'); c.phones.delete(p); } });
          send(ws, { t: 'welcome', phones: c.phones.size, push: pushOn });
          phoneStatus(c);
          return;
        }
        if (m.role === 'phone') {
          if (c.keyHash && !safeEq(c.keyHash, kh)) { send(ws, { t: 'error', msg: 'Vinculación caducada. Vuelve a escanear el QR desde el PC.' }); return ws.close(4003, 'clave'); }
          if (c.phones.size >= MAX_PHONES) { send(ws, { t: 'error', msg: 'Demasiados móviles vinculados a este PC.' }); return ws.close(4004, 'lleno'); }
          c.phones.add(ws); ws.role = 'phone';
          const coreOn = !!(c.core && c.core.readyState === 1);
          send(ws, { t: 'status', core: coreOn, push: pushOn });
          if (coreOn && c.last) send(ws, c.last);
          tellCorePhones(c);
          return;
        }
        return ws.close(4001, 'rol');
      }

      const c = channels.get(ws.ch);
      if (!c) return;

      /* Core -> móviles */
      if (ws.role === 'core') {
        if (m.t === 'accounts') { c.last = raw.toString(); c.lastAt = Date.now(); toPhones(c, c.last); return; }
        if (m.t === 'ack') { toPhones(c, m); return; }
        if (m.t === 'event') {
          toPhones(c, m);
          if (pushOn && PUSH_KINDS[m.kind] && c.subs.size) {
            const payload = JSON.stringify({ title: 'MDM · ' + PUSH_KINDS[m.kind], body: String(m.msg || '').slice(0, 240), tag: 'mdm-' + m.kind + '-' + (m.account || '') });
            c.subs.forEach((s, ep) => {
              webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: 'high' })
                .catch(err => { if (err && (err.statusCode === 404 || err.statusCode === 410)) { c.subs.delete(ep); send(c.core, { t: 'unsub', endpoint: ep }); } });
            });
          }
          return;
        }
        if (m.t === 'ping') { send(ws, { t: 'pong' }); return; }
        return;
      }

      /* Móvil -> Core */
      if (ws.role === 'phone') {
        if (m.t === 'ping') { send(ws, { t: 'pong' }); return; }
        if (m.t === 'get') { if (c.last) send(ws, c.last); return; }
        if (m.t === 'cmd') {
          const now = Date.now();
          cmdTimes = cmdTimes.filter(x => now - x < 10000);
          if (cmdTimes.length >= 8) return send(ws, { t: 'ack', id: m.id, ok: false, msg: 'Demasiadas órdenes seguidas. Espera unos segundos.' });
          cmdTimes.push(now);
          if (!PHONE_CMDS.has(m.cmd)) return send(ws, { t: 'ack', id: m.id, ok: false, msg: 'Esa acción solo se puede hacer desde el PC.' });
          if (!c.core || c.core.readyState !== 1) return send(ws, { t: 'ack', id: m.id, ok: false, msg: 'NinjaTrader no está conectado.' });
          const out = { t: 'cmd', id: String(m.id || '').slice(0, 40), cmd: m.cmd };
          if (m.account != null) out.account = String(m.account).slice(0, 80);
          if (m.on != null) out.on = m.on === true || m.on === 'true' ? 'true' : 'false';
          if (m.hours != null) out.hours = String(Math.max(1, Math.min(24, parseInt(m.hours, 10) || 1)));
          send(c.core, out);
          return;
        }
        if (m.t === 'sub' && m.endpoint && m.p256dh && m.auth) {
          const s = { endpoint: String(m.endpoint).slice(0, 600), p256dh: String(m.p256dh).slice(0, 200), auth: String(m.auth).slice(0, 100) };
          if (!/^https:\/\//.test(s.endpoint)) return;
          c.subs.set(s.endpoint, s);
          send(c.core, Object.assign({ t: 'sub' }, s));
          return;
        }
        if (m.t === 'unsub' && m.endpoint) {
          c.subs.delete(String(m.endpoint));
          send(c.core, { t: 'unsub', endpoint: String(m.endpoint) });
          return;
        }
      }
    });

    ws.on('close', () => {
      clearTimeout(helloTimer);
      const c = ws.ch && channels.get(ws.ch);
      if (!c) return;
      if (ws.role === 'core' && c.core === ws) { c.core = null; c.last = null; phoneStatus(c); }
      if (ws.role === 'phone') { c.phones.delete(ws); tellCorePhones(c); }
      cleanup(ws.ch);
    });
    ws.on('error', () => {});
  });

  const beat = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch (e) {}
    });
  }, 25000);
  server.on('close', () => clearInterval(beat));

  log('listo en ' + base + '/ (relay en ' + base + '/ws)');
  return { channels, wss };
};
