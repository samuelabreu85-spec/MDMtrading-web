/* MDM móvil · Centro de mando (PWA)
   Habla con el Core de NinjaTrader del PC a través del relay de mdmtrading.net (/m/ws).
   Nada se guarda en el servidor: aquí solo se recuerda la vinculación (canal + clave). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const money = (v, sign) => {
    const n = Number(v) || 0;
    const t = Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
    return (sign ? (n > 0.004 ? '+' : n < -0.004 ? '−' : '') : (n < 0 ? '−' : '')) + t;
  };
  const cls = v => (Number(v) > 0.004 ? 'pos' : Number(v) < -0.004 ? 'neg' : '');
  const ICON = {
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    x: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>',
    power: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>'
  };

  /* ── vinculación ─────────────────────────────────────────────── */
  const LS = 'mdm.m.pair';
  function readPair() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
  function savePair(p) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) {} }
  (function fromHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    const c = h.get('c'), k = h.get('k');
    if (c && k) { savePair({ ch: c, key: k, pc: h.get('pc') || '', at: Date.now() }); history.replaceState(null, '', location.pathname); }
  })();
  let pair = readPair();
  window.addEventListener('hashchange', () => { if (/[#&]c=/.test(location.hash)) location.reload(); });

  /* ── estado ──────────────────────────────────────────────────── */
  const st = { ws: null, sock: false, core: false, push: false, live: null, err: '', view: 'accounts', pending: new Map(), seq: 0, retry: 0, cal: null, calErr: '', calAt: 0 };

  /* ── conexión ────────────────────────────────────────────────── */
  let retryTimer = null, pingTimer = null;
  function connect() {
    if (!pair) return;
    clearTimeout(retryTimer);
    if (st.ws && (st.ws.readyState === 0 || st.ws.readyState === 1)) return;
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.pathname.replace(/[^/]*$/, '') + 'ws');
    st.ws = ws;
    ws.onopen = () => {
      st.sock = true; st.retry = 0; st.err = '';
      ws.send(JSON.stringify({ t: 'hello', role: 'phone', ch: pair.ch, key: pair.key }));
      clearInterval(pingTimer); pingTimer = setInterval(() => { try { ws.send('{"t":"ping"}'); } catch (e) {} }, 20000);
      header();
    };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    ws.onclose = ev => {
      st.sock = false; st.core = false; clearInterval(pingTimer);
      st.pending.forEach(p => p.resolve({ ok: false, msg: 'Conexión perdida.' })); st.pending.clear();
      if (ev.code === 4003) { st.err = 'Vinculación caducada. Vuelve a escanear el QR desde el PC.'; render(); header(); return; }
      header(); render();
      const wait = Math.min(30000, 1000 * Math.pow(2, st.retry++));
      retryTimer = setTimeout(connect, document.hidden ? Math.max(wait, 10000) : wait);
    };
    ws.onerror = () => {};
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && pair && (!st.ws || st.ws.readyState > 1)) { st.retry = 0; connect(); } });
  window.addEventListener('online', () => { st.retry = 0; connect(); });

  function onMsg(m) {
    if (m.t === 'status') { st.core = !!m.core; if (m.push != null) st.push = !!m.push; if (!st.core) st.live = null; header(); render(); return; }
    if (m.t === 'accounts') { st.core = true; st.live = m; header(); scheduleRender(); return; }
    if (m.t === 'ack') { const p = st.pending.get(String(m.id)); if (p) { st.pending.delete(String(m.id)); p.resolve({ ok: !!m.ok, msg: m.msg }); } return; }
    if (m.t === 'event') { eventToast(m); return; }
    if (m.t === 'error') { st.err = m.msg || 'Error'; render(); return; }
  }

  function cmd(name, args) {
    return new Promise(resolve => {
      if (!st.ws || st.ws.readyState !== 1 || !st.core) return resolve({ ok: false, msg: 'NinjaTrader no está conectado.' });
      const id = 'm' + (++st.seq) + '_' + Date.now().toString(36);
      st.pending.set(id, { resolve });
      st.ws.send(JSON.stringify(Object.assign({ t: 'cmd', id, cmd: name }, args || {})));
      setTimeout(() => { if (st.pending.has(id)) { st.pending.delete(id); resolve({ ok: false, msg: 'NinjaTrader no ha respondido.' }); } }, 12000);
    });
  }

  /* ── utilidades UI ───────────────────────────────────────────── */
  function toast(msg, kind, title) {
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.innerHTML = (title ? '<b>' + esc(title) + '</b>' : '') + esc(msg);
    $('#toasts').appendChild(d);
    setTimeout(() => d.remove(), kind === 'err' ? 6000 : 3800);
    if (navigator.vibrate && kind === 'err') navigator.vibrate(60);
  }
  const EV_T = { lock: 'Cuenta bloqueada', unlock: 'Cuenta desbloqueada', closeFail: 'Revisa la posición', blind: 'Escudo sin datos', blocked: 'Orden cancelada', copyWarn: 'Copiador' };
  function eventToast(m) { if (EV_T[m.kind]) toast(m.msg || '', m.kind === 'unlock' ? 'ok' : 'err', EV_T[m.kind]); }

  function sheet(html, bind) {
    const s = $('#sheet'), b = $('#sheetBox');
    b.innerHTML = html; s.hidden = false;
    const close = () => { s.hidden = true; b.innerHTML = ''; };
    s.querySelector('.sheet-bg').onclick = close;
    if (bind) bind(b, close);
    return close;
  }
  function confirmSheet(title, text, okLabel, danger, run) {
    sheet('<h3>' + esc(title) + '</h3><p>' + text + '</p><div class="row2"><button class="btn" data-x="no">Cancelar</button><button class="btn ' + (danger ? 'red' : 'gold') + '" data-x="si">' + esc(okLabel) + '</button></div>',
      (b, close) => b.addEventListener('click', async e => {
        const x = e.target.getAttribute('data-x');
        if (x === 'no') close();
        if (x === 'si') { e.target.disabled = true; e.target.textContent = 'Enviando…'; const r = await run(); close(); toast(r.ok ? (r.okMsg || 'Hecho') : (r.msg || 'No se pudo'), r.ok ? 'ok' : 'err'); }
      }));
  }

  /* ── mercado (hora de Nueva York) ────────────────────────────── */
  function zoned(tz) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date()).reduce((o, x) => (o[x.type] = x.value, o), {});
    return { wd: p.weekday, h: Number(p.hour) % 24, m: Number(p.minute), s: Number(p.second) };
  }
  const dur = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return (h ? h + ' h ' : '') + m + ' min'; };
  function market() {
    const ny = zoned('America/New_York');
    const d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(ny.wd);
    const t = ny.h * 60 + ny.m + ny.s / 60;
    const O = 570, C = 960, BRK = 1020, RE = 1080;
    let g = true;
    if (d === 6) g = false;
    if (d === 0 && t < RE) g = false;
    if (d === 5 && t >= BRK) g = false;
    if (d >= 1 && d <= 4 && t >= BRK && t < RE) g = false;
    const wk = d >= 1 && d <= 5;
    if (wk && t >= O && t < C) return { l: 'Sesión NY abierta', s: 'cierra en ' + dur(C - t), dot: 'on' };
    if (wk && t < O && g) return { l: 'Globex · pre-apertura', s: 'NY abre en ' + dur(O - t), dot: 'warn' };
    if (g) return { l: 'Globex abierto', s: 'fuera de horario NY', dot: 'warn' };
    return { l: 'Mercado cerrado', s: '', dot: '' };
  }

  function header() {
    const c = $('#conn');
    if (!pair) { c.className = 'pill'; c.lastElementChild.textContent = 'Sin vincular'; }
    else if (st.sock && st.core) { c.className = 'pill on'; c.lastElementChild.textContent = 'NinjaTrader'; }
    else if (st.sock) { c.className = 'pill off'; c.lastElementChild.textContent = 'PC sin conexión'; }
    else { c.className = 'pill'; c.lastElementChild.textContent = 'Conectando…'; }
    const mk = market();
    $('#mkt').innerHTML = '<i class="' + mk.dot + '"></i><b>' + esc(mk.l) + '</b>' + (mk.s ? ' · ' + esc(mk.s) : '');
  }

  /* ── vistas ──────────────────────────────────────────────────── */
  let rq = false;
  function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }

  function render() {
    const v = $('#view');
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === st.view));
    if (!pair) { $('#tabs').hidden = true; v.innerHTML = pairView(); return; }
    $('#tabs').hidden = false;
    if (st.view === 'cal') { v.innerHTML = calView(); return; }
    if (st.view === 'settings') { v.innerHTML = settingsView(); bindSettings(); return; }
    if (st.err) { v.innerHTML = '<div class="card empty"><b>No se puede conectar</b>' + esc(st.err) + '</div>'; return; }
    if (!st.sock) { v.innerHTML = '<div class="card empty"><b>Conectando…</b>Comprobando la conexión con tu PC.</div>'; return; }
    if (!st.core || !st.live) { v.innerHTML = '<div class="card empty"><b>Sin conexión con NinjaTrader</b>Abre NinjaTrader en tu PC y la conexión se restablecerá sola.</div>'; return; }
    v.innerHTML = st.view === 'copy' ? copyView() : accountsView();
  }

  function pairView() {
    return '<div class="pair"><img src="img/icon-512.png" alt=""><h1>Vincula tu móvil</h1>' +
      '<p class="mut">Controla tus cuentas de NinjaTrader desde aquí.</p>' +
      '<div class="steps"><div>En tu PC, abre el <b>Centro de mando</b> y entra en <b>Móvil</b>.</div>' +
      '<div>Pulsa <b>Vincular móvil</b>: aparecerá un código QR.</div>' +
      '<div>Escanéalo con la cámara de este móvil y ábrelo. Listo.</div></div></div>';
  }

  function rows() {
    const a = (st.live && st.live.accounts) || [];
    return a.map(x => Object.assign({}, x, { day: (Number(x.realized) || 0) + (Number(x.unrealized) || 0), positions: x.positions || [], sim: /^Sim\d*$/i.test(x.name) }))
      .sort((x, y) => (y.positions.length > 0) - (x.positions.length > 0) || x.sim - y.sim || x.name.localeCompare(y.name));
  }

  function lockLeft(s) {
    const sec = Math.max(0, Math.round(((Number(s.until) || 0) - Date.now()) / 1000));
    return Math.floor(sec / 3600) + ':' + pad(Math.floor(sec % 3600 / 60));
  }

  function accountsView() {
    const r = rows();
    if (!r.length) return '<div class="card empty"><b>Sin cuentas activas</b>NinjaTrader está conectado, pero no hay ninguna cuenta conectada a su bróker.</div>';
    const day = r.reduce((s, x) => s + x.day, 0);
    const npos = r.reduce((s, x) => s + x.positions.length, 0);
    const nlock = r.filter(x => x.shield && x.shield.locked).length;
    let h = '<div class="card hero"><div><div class="lbl">P&amp;L de hoy</div><div class="big mono ' + cls(day) + '">' + money(day, true) + '</div></div>' +
      '<div class="side">' + r.length + ' cuentas<b>' + npos + ' pos.</b>' + (nlock ? '<span style="color:#fca5a5">🔒 ' + nlock + '</span>' : '') + '</div></div>';
    h += r.map(x => {
      const s = x.shield;
      let shd;
      if (!s) shd = '<span class="shd offs">—</span>';
      else if (s.locked) shd = '<span class="shd lk">' + ICON.lock + 'Bloqueada · ' + lockLeft(s) + '</span>';
      else if (s.protected) shd = '<span class="shd on">' + ICON.shield + 'Protegida</span>';
      else shd = '<span class="shd offs">' + ICON.shield + 'Sin escudo</span>';
      const pos = x.positions.map(p => '<span class="posb ' + (p.side === 'Long' ? 'long' : 'short') + '">' + (p.side === 'Long' ? 'Compra ' : 'Venta ') + p.qty + ' ' + esc(p.root) +
        ' <span class="mut" style="font-weight:500">@ ' + Number(p.avg).toLocaleString('es-ES', { maximumFractionDigits: 2 }) + '</span></span>').join(' ');
      return '<div class="card acc' + (s && s.locked ? ' locked' : '') + '">' +
        '<div class="acc-h"><div><div class="acc-n">' + esc(x.name) + '</div><div class="acc-c">' + esc(x.connection || '') + (x.orders ? ' · ' + x.orders + ' órdenes' : '') + '</div></div>' +
        '<div class="acc-p mono ' + cls(x.day) + '"><small>Hoy</small>' + money(x.day, true) + '</div></div>' +
        '<div class="acc-row"><span>Realizado <b class="mono ' + cls(x.realized) + '">' + money(x.realized, true) + '</b></span><span>Flotante <b class="mono ' + cls(x.unrealized) + '">' + money(x.unrealized, true) + '</b></span></div>' +
        (pos ? '<div>' + pos + '</div>' : '') +
        (s && s.locked && s.reason ? '<div class="acc-c" style="margin-top:8px;color:#fca5a5">' + esc(s.reason) + '</div>' : '') +
        '<div class="acc-f">' + shd + '<button class="btn" data-acts="' + esc(x.name) + '">Acciones</button></div></div>';
    }).join('');
    return h;
  }

  function actionsSheet(name) {
    const x = rows().find(a => a.name === name); if (!x) return;
    const s = x.shield || {};
    const cfg = (st.live && st.live.shieldCfg) || {};
    const winOpen = !!cfg.shieldWindowOpen || !!cfg.shieldWindowAvailable;
    const canOff = s.protected && !s.locked && winOpen;
    const hasPos = x.positions.length > 0;
    sheet('<h3>' + esc(name) + '</h3><p>' + esc(x.connection || '') + ' · Hoy <b class="' + cls(x.day) + '">' + money(x.day, true) + '</b></p>' +
      '<div class="set" style="border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px;background:var(--card)"><div><b>Escudo</b><small>' +
      (s.locked ? 'Cuenta bloqueada: no se puede quitar.' : s.protected ? (canOff ? 'Protegida. Puedes quitarlo mientras la ventana de escudos esté abierta.' : 'Protegida. La ventana para quitarlo ya se ha cerrado hoy.') : 'Sin protección. Actívalo para aplicar tus reglas.') +
      '</small></div><label class="sw"><input type="checkbox" id="swShield"' + (s.protected ? ' checked' : '') + ((s.protected && !canOff) ? ' disabled' : '') + '><span></span></label></div>' +
      '<button class="opt gold" data-a="lock"' + (!s.protected || s.locked ? ' disabled' : '') + '>' + ICON.lock + '<div><b>Bloquear ahora</b><small>' + (s.protected ? 'Bloqueo manual de 1 a 24 h.' : 'Activa antes el escudo.') + '</small></div></button>' +
      '<button class="opt" data-a="cancel"' + (!x.orders ? ' disabled' : '') + '>' + ICON.x + '<div><b>Cancelar órdenes</b><small>' + (x.orders ? x.orders + ' órdenes vivas (SL y TP incluidos).' : 'No hay órdenes vivas.') + '</small></div></button>' +
      '<button class="opt danger" data-a="flatten"' + (!(hasPos || x.orders) ? ' disabled' : '') + '>' + ICON.stop + '<div><b>Aplanar cuenta</b><small>' + (hasPos ? 'Cierra a mercado todas las posiciones.' : 'No hay posiciones abiertas.') + '</small></div></button>',
      (b, close) => {
        b.querySelector('#swShield').addEventListener('change', async e => {
          const on = e.target.checked; e.target.disabled = true;
          const r = await cmd('shield', { account: name, on });
          if (!r.ok) { e.target.checked = !on; toast(r.msg, 'err'); } else toast(on ? 'Escudo activado en ' + name : 'Escudo quitado en ' + name, 'ok');
          e.target.disabled = false;
        });
        b.addEventListener('click', e => {
          const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
          const k = a.dataset.a;
          if (k === 'cancel') { close(); confirmSheet('Cancelar órdenes', 'Se cancelarán todas las órdenes vivas de <b>' + esc(name) + '</b>, SL y TP incluidos. Si tiene posición, se quedará sin protección.', 'Sí, cancelar', true,
            async () => Object.assign(await cmd('cancelOrders', { account: name }), { okMsg: 'Órdenes canceladas: ' + name })); }
          if (k === 'flatten') { close(); confirmSheet('Aplanar cuenta', 'Se cerrarán <b>A MERCADO</b> todas las posiciones de <b>' + esc(name) + '</b> y se cancelarán sus órdenes.' +
            (hasPos ? '<br><br>' + x.positions.map(p => (p.side === 'Long' ? 'Compra ' : 'Venta ') + p.qty + ' ' + esc(p.root)).join(', ') : ''), 'Sí, aplanar', true,
            async () => Object.assign(await cmd('flatten', { account: name }), { okMsg: 'Orden de aplanar enviada: ' + name })); }
          if (k === 'lock') { close(); lockSheet(name); }
        });
      });
  }

  function lockSheet(name) {
    let h = 1;
    sheet('<h3>Bloquear ' + esc(name) + '</h3><p>Se cierra lo que tenga abierto y no podrá operar hasta que pase el tiempo. No se puede deshacer desde el móvil.</p>' +
      '<div class="hrs">' + [1, 2, 4, 8, 24].map(n => '<button class="btn' + (n === 1 ? ' on' : '') + '" data-h="' + n + '">' + n + ' h</button>').join('') + '</div>' +
      '<div class="row2"><button class="btn" data-x="no">Cancelar</button><button class="btn red" data-x="si">Bloquear 1 h</button></div>',
      (b, close) => b.addEventListener('click', async e => {
        const hb = e.target.closest('[data-h]');
        if (hb) { h = +hb.dataset.h; b.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === hb)); b.querySelector('[data-x=si]').textContent = 'Bloquear ' + h + ' h'; return; }
        const x = e.target.getAttribute('data-x');
        if (x === 'no') close();
        if (x === 'si') { e.target.disabled = true; const r = await cmd('manualLock', { account: name, hours: h }); close(); toast(r.ok ? name + ' bloqueada ' + h + ' h' : r.msg, r.ok ? 'ok' : 'err'); }
      }));
  }

  function copyView() {
    const c = st.live && st.live.copy;
    if (!c) return '<div class="card empty"><b>Copiador no disponible</b>Actualiza MDMgestorCuentas en NinjaTrader.</div>';
    const fol = c.followers || [];
    const act = fol.filter(f => f.enabled).length;
    let h = '<div class="card"><div class="power"><button class="pw' + (c.on ? ' on' : '') + '" id="cpPower" aria-label="Encender o apagar">' + ICON.power + '</button>' +
      '<div><b>' + (c.on ? 'Copiador encendido' : 'Copiador apagado') + '</b><small>' + (c.master ? 'Maestra: ' + esc(c.master) + (c.masterOk ? '' : ' (sin conexión)') : 'Sin cuenta maestra: elígela en el PC.') + '</small></div></div></div>';
    h += '<h2>Seguidoras · ' + act + ' activas</h2><div class="card">' + (fol.length ? fol.map(f =>
      '<div class="fl"><div><span class="n">' + esc(f.name) + '</span><small>x' + Number(f.ratio || 1).toLocaleString('es-ES') + (f.last ? ' · ' + esc(f.last) + (f.lastAt ? ' ' + esc(f.lastAt) : '') : '') + '</small></div>' +
      (f.locked ? '<span class="tag bad">🔒 bloqueada</span>' : !f.connected ? '<span class="tag mut">sin conexión</span>' : f.enabled ? '<span class="tag ok">activa</span>' : '<span class="tag mut">pausada</span>') + '</div>').join('')
      : '<div class="empty" style="padding:14px">Sin seguidoras. Se eligen desde el PC.</div>') + '</div>';
    if (c.feed && c.feed.length) h += '<h2>Últimos movimientos</h2><div class="card feed">' + c.feed.slice(0, 12).map(x => '<div>' + esc(x) + '</div>').join('') + '</div>';
    return h;
  }

  /* ── calendario ──────────────────────────────────────────────── */
  let calBusy = false, calFailAt = 0;
  async function loadCal(force) {
    if (calBusy) return;
    if (!force && st.cal && Date.now() - st.calAt < 10 * 60e3) return;
    if (!force && !st.cal && Date.now() - calFailAt < 60e3) return;
    calBusy = true;
    try {
      const r = await fetch('api/calendar', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'sin datos');
      st.cal = j.events; st.calAt = Date.now(); st.calErr = '';
    } catch (e) { st.calErr = 'No se ha podido cargar el calendario. Se reintenta en un minuto.'; calFailAt = Date.now(); }
    calBusy = false;
    if (st.view === 'cal') render();
  }
  function nyIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function nthDow(y, m, dow, n) { const d = new Date(y, m, 1); while (d.getDay() !== dow) d.setDate(d.getDate() + 1); d.setDate(d.getDate() + 7 * (n - 1)); return d; }
  function lastDow(y, m, dow) { const d = new Date(y, m + 1, 0); while (d.getDay() !== dow) d.setDate(d.getDate() - 1); return d; }
  function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da); }
  function observed(d) { const x = new Date(d); if (x.getDay() === 6) x.setDate(x.getDate() - 1); else if (x.getDay() === 0) x.setDate(x.getDate() + 1); return x; }
  function holidays(y) {
    const L = [], add = (d, n) => L.push({ date: nyIso(d), name: n, early: false });
    const ny = new Date(y, 0, 1); if (ny.getDay() !== 6) add(observed(ny), 'Año Nuevo');
    add(nthDow(y, 0, 1, 3), 'Martin Luther King Jr.'); add(nthDow(y, 1, 1, 3), 'Presidents\' Day');
    const gf = easter(y); gf.setDate(gf.getDate() - 2); add(gf, 'Viernes Santo');
    add(lastDow(y, 4, 1), 'Memorial Day'); add(observed(new Date(y, 5, 19)), 'Juneteenth'); add(observed(new Date(y, 6, 4)), 'Independencia');
    add(nthDow(y, 8, 1, 1), 'Labor Day'); const tg = nthDow(y, 10, 4, 4); add(tg, 'Acción de Gracias'); add(observed(new Date(y, 11, 25)), 'Navidad');
    const closed = new Set(L.map(h => h.date));
    const early = (d, n) => { if (d.getDay() > 0 && d.getDay() < 6 && !closed.has(nyIso(d))) L.push({ date: nyIso(d), name: n, early: true }); };
    early(new Date(y, 6, 3), 'Víspera de Independencia'); const bf = new Date(tg); bf.setDate(bf.getDate() + 1); early(bf, 'Viernes de Acción de Gracias'); early(new Date(y, 11, 24), 'Nochebuena');
    return L;
  }
  function calView() {
    if (!st.cal) { loadCal(); return '<div class="card empty"><b>' + (st.calErr ? 'Calendario no disponible' : 'Cargando calendario…') + '</b>' + esc(st.calErr) + '</div>'; }
    const now = Date.now();
    const ev = st.cal.slice().sort((a, b) => (a.ts || Date.parse(a.day) || 0) - (b.ts || Date.parse(b.day) || 0));
    const next = ev.find(e => e.ts && e.ts > now && e.impact === 'high') || ev.find(e => e.ts && e.ts > now);
    let h = '';
    if (next) {
      const ms = next.ts - now, s = Math.floor(ms / 1000), H = Math.floor(s / 3600), M = Math.floor(s % 3600 / 60), S = s % 60;
      const cd = H >= 24 ? Math.floor(H / 24) + ' d ' + (H % 24) + ' h' : H > 0 ? H + 'h ' + pad(M) + 'm' : M + 'm ' + pad(S) + 's';
      h += '<div class="card next"><div class="lbl"><span class="imp ' + next.impact + '"></span>Próxima noticia</div><div class="tt">' + esc(next.title) + '</div>' +
        '<div class="cd mono" id="cd">' + cd + '</div><div class="mut" style="font-size:13px;margin-top:4px">' +
        new Date(next.ts).toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' }) + '</div></div>';
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const byDay = new Map();
    ev.forEach(e => {
      const d = e.ts ? new Date(e.ts) : (e.day ? new Date(e.day + 'T12:00:00') : null); if (!d) return;
      const dd = new Date(d); dd.setHours(0, 0, 0, 0); if (dd < today) return;
      const k = nyIso(dd); if (!byDay.has(k)) byDay.set(k, { d: dd, list: [] }); byDay.get(k).list.push(e);
    });
    h += '<h2>Noticias USD</h2><div class="card">';
    if (!byDay.size) h += '<div class="empty" style="padding:14px">No quedan noticias esta semana.</div>';
    byDay.forEach(g => {
      const diff = Math.round((g.d - today) / 864e5);
      const lbl = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : g.d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
      h += '<div class="dayh" style="margin-top:12px">' + esc(lbl) + '</div>' + g.list.map(e => {
        const past = e.ts && e.ts < now - 5 * 60e3;
        const hh = e.ts ? new Date(e.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : (e.timeText || '—');
        const det = [e.actual ? 'Real <b>' + esc(e.actual) + '</b>' : '', e.forecast ? 'Prev. <b>' + esc(e.forecast) + '</b>' : '', e.previous ? 'Ant. <b>' + esc(e.previous) + '</b>' : ''].filter(Boolean).join(' · ');
        return '<div class="ev' + (past ? ' past' : '') + '"><div class="h mono">' + esc(hh) + '</div><div><div class="t"><span class="imp ' + e.impact + '"></span>' + esc(e.title) + '</div>' + (det ? '<div class="d">' + det + '</div>' : '') + '</div></div>';
      }).join('');
    });
    h += '</div>';
    const y = new Date().getFullYear(), tIso = nyIso(today);
    const hol = holidays(y).concat(holidays(y + 1)).filter(x => x.date >= tIso).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    h += '<h2>Festivos de la bolsa</h2><div class="card">' + hol.map(x => {
      const d = new Date(x.date + 'T12:00:00'), days = Math.round((new Date(x.date + 'T00:00:00') - today) / 864e5);
      return '<div class="hol"><div>' + esc(x.name) + (x.early ? ' <small>· cierre 13:00 NY</small>' : '') + '</div><small>' +
        (days === 0 ? 'hoy' : days === 1 ? 'mañana' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })) + '</small></div>';
    }).join('') + '</div>';
    return h;
  }

  /* ── ajustes y avisos ────────────────────────────────────────── */
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no';
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  }
  function b64ToU8(b) { const p = '='.repeat((4 - b.length % 4) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); }
  async function enablePush() {
    const k = await fetch('api/vapid').then(r => r.json()).catch(() => ({}));
    if (!k.key) throw new Error('Los avisos todavía no están activados en el servidor.');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Has denegado los avisos. Actívalos en los ajustes del navegador.');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.key) });
    const j = sub.toJSON();
    if (!st.ws || st.ws.readyState !== 1) throw new Error('Sin conexión con el servidor.');
    st.ws.send(JSON.stringify({ t: 'sub', endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }));
  }
  async function disablePush() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { try { st.ws && st.ws.send(JSON.stringify({ t: 'unsub', endpoint: sub.endpoint })); } catch (e) {} await sub.unsubscribe(); }
  }
  function settingsView() {
    const inst = standalone() ? '' : '<div class="card"><div class="set"><div><b>Instalar en el móvil</b><small>' +
      (isIOS ? 'En Safari: botón Compartir → «Añadir a pantalla de inicio». Así funcionan también los avisos.' : 'En Chrome: menú ⋮ → «Añadir a pantalla de inicio» o «Instalar aplicación».') + '</small></div></div></div>';
    return inst + '<h2>Avisos</h2><div class="card"><div class="set"><div><b>Avisos en el móvil</b><small id="pushTxt">Cuenta bloqueada, desbloqueada, fallos al cerrar y copiador.</small></div>' +
      '<label class="sw"><input type="checkbox" id="swPush" disabled><span></span></label></div></div>' +
      '<h2>Vinculación</h2><div class="card"><div class="set"><div><b>PC vinculado</b><small>' + (pair && pair.pc ? esc(pair.pc) + ' · ' : '') +
      (st.core ? 'NinjaTrader conectado' : st.sock ? 'NinjaTrader sin conexión' : 'sin conexión') + '</small></div></div>' +
      '<div class="set"><div><b>Desvincular este móvil</b><small>Para volver a usarlo tendrás que escanear el QR otra vez.</small></div><button class="btn" id="unpair">Desvincular</button></div></div>' +
      '<p class="mut" style="text-align:center;font-size:12px;margin-top:18px">Las reglas de los escudos y la configuración del copiador se cambian desde el PC.</p>';
  }
  async function bindSettings() {
    const sw = $('#swPush'), txt = $('#pushTxt');
    if (isIOS && !standalone()) { txt.textContent = 'En iPhone, primero añade la app a la pantalla de inicio.'; }
    else {
      const ps = await pushState().catch(() => 'no');
      if (ps === 'no') txt.textContent = 'Este navegador no admite avisos.';
      else { sw.disabled = false; sw.checked = ps === 'on'; }
      sw.onchange = async () => {
        sw.disabled = true;
        try { if (sw.checked) { await enablePush(); toast('Avisos activados', 'ok'); } else { await disablePush(); toast('Avisos desactivados', 'ok'); } }
        catch (e) { sw.checked = !sw.checked; toast(e.message || 'No se pudo', 'err'); }
        sw.disabled = false;
      };
    }
    $('#unpair').onclick = () => confirmSheet('Desvincular', 'Este móvil dejará de ver tus cuentas.', 'Desvincular', true, async () => {
      try { await disablePush(); } catch (e) {}
      try { localStorage.removeItem(LS); } catch (e) {}
      pair = null; try { st.ws && st.ws.close(); } catch (e) {}
      st.live = null; st.view = 'accounts'; render(); header();
      return { ok: true, okMsg: 'Móvil desvinculado' };
    });
  }

  /* ── eventos ─────────────────────────────────────────────────── */
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.view = b.dataset.v; if (st.view === 'cal') loadCal(); render(); window.scrollTo(0, 0); });
  $('#view').addEventListener('click', e => {
    const a = e.target.closest('[data-acts]'); if (a) return actionsSheet(a.getAttribute('data-acts'));
    if (e.target.closest('#cpPower')) {
      const c = st.live && st.live.copy; if (!c) return;
      const on = !c.on;
      confirmSheet(on ? 'Encender copiador' : 'Apagar copiador', on ? 'Todo lo que se haga en <b>' + esc(c.master || 'la maestra') + '</b> se copiará en las seguidoras activas.' : 'Las seguidoras dejarán de copiar. Lo que esté abierto sigue abierto.',
        on ? 'Encender' : 'Apagar', !on, async () => Object.assign(await cmd('copyOn', { on }), { okMsg: on ? 'Copiador encendido' : 'Copiador apagado' }));
    }
  });

  setInterval(() => { header(); if (st.view === 'cal' && st.cal) render(); else if (st.view === 'accounts' && st.live && rows().some(x => x.shield && x.shield.locked)) scheduleRender(); }, 1000);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  header(); render(); connect();
})();
