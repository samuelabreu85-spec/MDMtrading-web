/* MDM · Antiestrés — la prueba de fondeo MDM en forma de snake.
   Cada TP +$250, cada SL −$250 (morderte la cola también es SL y la corta). Las paredes se cruzan.
   +$3.000 = prueba aprobada (banner con el sello MDM); −$3.000 = prueba suspendida.
   Movimiento suave (interpolado a 60 fps), cuerpo en tubo dorado con brillo, partículas al cobrar TP
   y temblor al tocar SL. Se abre con MDMzen.open(). Sin red, sin servidor: todo en el móvil. */
(function () {
  'use strict';
  // Sello MDM (WebP incrustado: así el juego es un único archivo y funciona sin red)
  const SELLO = 'data:image/webp;base64,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';
  // Estilos del botón y de la pantalla del juego
  const CSS = "/* bot\u00f3n Antiestr\u00e9s (cabecera) */\n.zen-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:99px;border:1px solid var(--gold3);\n  background:linear-gradient(180deg,rgba(212,175,55,.16),rgba(212,175,55,.05));color:var(--gold2);font:700 12px/1 'DM Sans',sans-serif;cursor:pointer}\n.zen-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\n.top-r{display:flex;align-items:center;gap:8px}\n/* pantalla del juego */\n.zen{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;gap:12px;\n  padding:calc(14px + var(--safe-t)) 16px calc(18px + var(--safe-b));background:radial-gradient(120% 60% at 50% -10%,rgba(212,175,55,.14),transparent 60%),var(--bg)}\n.zen-top{width:100%;max-width:460px;display:flex;align-items:center;justify-content:space-between}\n.zen-top b{display:block;padding-top:3px;font:900 18px/1.25 'Cinzel',serif;letter-spacing:2.5px;background:linear-gradient(180deg,#fff6dc,#d4af37 70%,#8c6a22);-webkit-background-clip:text;background-clip:text;color:transparent}\n.zen-top small{display:block;color:var(--t3);font-size:12px;margin-top:4px}\n.zen-x{width:38px;height:38px;border-radius:50%;border:1px solid var(--line2);background:var(--card);color:var(--t2);font-size:16px;cursor:pointer}\n.zen-score{width:100%;max-width:460px;display:flex;gap:10px}\n.zen-score>div{flex:1;background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);border-radius:14px;padding:10px 12px}\n.zen-score small{display:block;font:700 10px/1 'Cinzel',serif;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin-bottom:6px}\n.zen-score span{font-size:22px;font-weight:700}\n.zen-board{position:relative;border:1px solid var(--gold3);border-radius:14px;overflow:hidden;box-shadow:0 0 24px rgba(212,175,55,.12)}\n.zen-board canvas{display:block}\n.zen-msg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(11,9,6,.78);backdrop-filter:blur(3px)}\n.zen-msg b{font:900 20px/1 'Cinzel',serif;letter-spacing:2px;color:var(--neg)}\n.zen-msg span{font-size:26px;font-weight:700}\n.zen-msg small{color:var(--t3)}\n.zen-msg .btn{margin-top:8px;padding:10px 22px;border-radius:12px;border:1px solid var(--gold3);background:linear-gradient(180deg,#d4af37,#8c6a22);color:#1a1408;font-weight:700;cursor:pointer}\n.zen-pad{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:auto}\n.zen-pad>div{display:flex;gap:10px}\n.zen-pad button{width:min(28vw,118px);height:min(10.5vh,84px);min-height:60px;border-radius:18px;border:1px solid var(--gold3);background:linear-gradient(180deg,var(--card2),var(--card));color:var(--gold2);font-size:28px;cursor:pointer;touch-action:manipulation;-webkit-user-select:none;user-select:none;box-shadow:0 4px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(243,217,139,.12);transition:transform .06s}.zen-pad button:active{transform:scale(.94);background:linear-gradient(180deg,rgba(212,175,55,.28),var(--card))}\n.zen-bump{animation:zenBump .32s ease-out}\n@keyframes zenBump{0%{transform:scale(1)}35%{transform:scale(1.18);text-shadow:0 0 14px rgba(52,211,153,.8)}100%{transform:scale(1)}}\n.zen-score span{display:inline-block}\n/* barra de la prueba: \u22123.000 \u2190 0 \u2192 +3.000 */\n.zen-bar{width:100%;max-width:460px}\n.zen-bar-t{position:relative;height:8px;border-radius:99px;background:var(--card2);border:1px solid var(--line);overflow:hidden}\n.zen-bar-t em{position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:var(--gold3)}\n.zen-bar-t i{position:absolute;top:0;bottom:0;left:50%;width:0;transition:left .25s,width .25s}\n.zen-bar-t i.up{background:linear-gradient(90deg,#065f46,var(--pos));box-shadow:0 0 10px rgba(52,211,153,.6)}\n.zen-bar-t i.dn{background:linear-gradient(90deg,var(--neg),#7f1d1d);box-shadow:0 0 10px rgba(248,113,113,.6)}\n.zen-bar-l{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-top:5px}\n/* pantallas finales */\n.zen-msg p{margin:0 18px;text-align:center;color:var(--t2);font-size:14px}\n.zen-msg p strong{color:var(--gold2)}\n.zen-msg.ok{background:radial-gradient(70% 60% at 50% 40%,rgba(30,64,175,.35),rgba(11,9,6,.88))}\n.zen-msg.ok b{color:var(--gold2);font-size:22px}\n.zen-sello{width:46%;max-width:190px;border-radius:50%;box-shadow:0 0 0 3px rgba(243,217,139,.6),0 0 40px rgba(59,130,246,.6);\n  animation:zenSello .7s cubic-bezier(.2,1.4,.4,1) both;transform:rotate(-10deg)}\n@keyframes zenSello{0%{transform:scale(2.6) rotate(-30deg);opacity:0}70%{opacity:1}100%{transform:scale(1) rotate(-10deg);opacity:1}}\n.zen-firma{font:700 11px/1 'Cinzel',serif!important;letter-spacing:3px;color:var(--gold)!important;text-transform:uppercase}\n\n.top-r .pill{white-space:nowrap}\n.brand small{white-space:nowrap}\n@media (max-width:430px){.zen-btn{width:34px;height:34px;padding:0;justify-content:center}.zen-btn span{display:none}.zen-btn svg{width:17px;height:17px}}\n";
  const N = 14, TP_USD = 250, SL_USD = 250, GOAL = 3000, MAX_LOSS = 3000, REC_LS = 'mdm.zen.aprobadas';
  const GOLD = '#d4af37', GOLD2 = '#f3d98b', GOLD3 = '#8c6a22', UP = '#34d399', DN = '#f87171';
  const D = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  const logo = new Image(); logo.src = 'img/icon-512.png';
  const sello = new Image(); sello.src = SELLO;
  let ov, cv, ctx, sc, rc, msg, cell = 24, px = 336, raf = 0, demo = false, rng = Math.random;
  let snake, prev, dir, nextDir, food, reds, score, rec, speed, alive, lastStep, parts, floats, shake, flash, tps, demoHit, barEl, swallows;

  const getRec = () => { try { return +localStorage.getItem(REC_LS) || 0; } catch (e) { return 0; } };
  const setRec = v => { try { localStorage.setItem(REC_LS, String(v)); } catch (e) {} };
  const key = p => p.x + ',' + p.y;
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // 3.000 (es-ES no agrupa 4 cifras)
  const SWALLOW = 2;
  const usd = v => (v < 0 ? '−' : '+') + '$' + fmt(Math.abs(v));
  const wrap = v => (v + N) % N;

  /* ── interfaz ──────────────────────────────────────────────────────────── */
  function build() {
    ov = document.createElement('div');
    ov.className = 'zen';
    ov.innerHTML =
      '<div class="zen-top"><div><b>PRUEBA DE FONDEO</b><small>Cuenta MDM 50K · TP +$250 · SL −$250</small></div>' +
      '<button class="zen-x" aria-label="Cerrar">✕</button></div>' +
      '<div class="zen-score"><div><small>P&amp;L</small><span class="mono" id="zenS">$0</span></div>' +
      '<div><small>Aprobadas</small><span class="mono" id="zenR">0</span></div></div>' +
      '<div class="zen-bar"><div class="zen-bar-t"><i id="zenBar"></i><em></em></div><div class="zen-bar-l"><span class="neg">−$3.000 suspendes</span><span class="pos">+$3.000 apruebas</span></div></div>' +
      '<div class="zen-board"><canvas id="zenC"></canvas><div class="zen-msg" id="zenM" hidden></div></div>' +
      '<div class="zen-pad"><button data-d="up">▲</button><div><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button></div></div>';
    document.body.appendChild(ov);
    cv = ov.querySelector('#zenC'); ctx = cv.getContext('2d');
    sc = ov.querySelector('#zenS'); rc = ov.querySelector('#zenR'); msg = ov.querySelector('#zenM'); barEl = ov.querySelector('#zenBar');
    ov.querySelector('.zen-x').onclick = close;
    ov.querySelectorAll('[data-d]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); turn(b.dataset.d); }));
    let sx = 0, sy = 0;
    cv.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    cv.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;   // permite encadenar giros sin levantar el dedo
    }, { passive: true });
    document.addEventListener('keydown', e => {
      if (!ov || ov.hidden) return;
      const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
      if (m) { e.preventDefault(); turn(m); }
    });
    window.addEventListener('resize', () => { if (ov && !ov.hidden) size(); });
  }

  function turn(d) {
    if (!alive) return;
    const v = D[d];
    if (v.x === -dir.x && v.y === -dir.y) return;   // sin media vuelta
    nextDir = v;
  }

  function size() {
    // El tablero ocupa el ancho disponible, pero sin empujar las flechas fuera de la pantalla
    const w = Math.min(ov.clientWidth - 32, 460), cs = getComputedStyle(ov);
    let used = 0; [...ov.children].forEach(el => { if (!el.classList.contains('zen-board')) used += el.getBoundingClientRect().height; });
    const gap = parseFloat(cs.rowGap) || 12;
    const hAvail = ov.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - used - gap * (ov.children.length - 1);
    const side = Math.max(220, Math.min(w, hAvail));
    cell = side / N; px = cell * N;
    const r = Math.min(window.devicePixelRatio || 1, 3);
    cv.style.width = cv.style.height = px + 'px';
    cv.width = cv.height = Math.round(px * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  /* ── lógica (en casillas) ──────────────────────────────────────────────── */
  function free() {
    const busy = new Set(snake.map(key).concat(reds.map(key)));
    if (food) busy.add(key(food));
    const h = snake[0];
    for (let t = 0; t < 600; t++) {
      const p = { x: Math.floor(rng() * N), y: Math.floor(rng() * N) };
      if (busy.has(key(p))) continue;
      if (Math.abs(p.x - h.x) + Math.abs(p.y - h.y) < 3) continue;   // nada aparece pegado a la cabeza
      return p;
    }
    return null;
  }

  function start() {
    snake = [{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }];
    prev = snake.map(p => ({ ...p }));
    dir = nextDir = D.right; reds = []; food = null; score = 0; speed = 170; alive = true; tps = 0; demoHit = 0;
    parts = []; floats = []; shake = 0; flash = 0; swallows = [];
    food = free(); food.t = performance.now(); rec = getRec();
    rc.textContent = fmt(rec); msg.hidden = true; msg.className = 'zen-msg'; pnl();
    lastStep = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }

  function pnl() {
    sc.textContent = score === 0 ? '$0' : usd(score);
    sc.className = 'mono ' + (score > 0 ? 'pos' : score < 0 ? 'neg' : '');
    barEl.style.left = score >= 0 ? '50%' : (50 + score / MAX_LOSS * 50) + '%';
    barEl.style.width = (Math.abs(score) / (score >= 0 ? GOAL : MAX_LOSS) * 50) + '%';
    barEl.className = score >= 0 ? 'up' : 'dn';
  }

  function step(now) {
    if (demo) nextDir = autoplay() || nextDir;
    dir = nextDir;
    const h = { x: wrap(snake[0].x + dir.x), y: wrap(snake[0].y + dir.y) };
    const eats = food && h.x === food.x && h.y === food.y;
    // El TP tragado baja por el cuerpo (2 segmentos por paso, así se ve viajar); crece cuando llega a la cola
    swallows.forEach(w => w.age += SWALLOW);
    const grows = swallows.some(w => w.age >= snake.length);
    swallows = swallows.filter(w => w.age < snake.length);
    const body = grows ? snake : snake.slice(0, -1);
    const self = body.findIndex(p => p.x === h.x && p.y === h.y);
    const sl = reds.findIndex(p => p.x === h.x && p.y === h.y);
    prev = snake.map(p => ({ ...p }));
    snake.unshift(h);
    lastStep = now;
    if (self >= 0) {                                      // morderse la cola: SL y se corta por ahí
      const keep = Math.max(2, self + 1);
      snake = snake.slice(0, keep); prev = prev.slice(0, keep);
      return loss(h, now);
    }
    if (grows) prev.push({ ...prev[prev.length - 1] });   // la cola nueva nace donde estaba la anterior
    else snake.pop();
    if (eats) {
      swallows.push({ age: 0 });
      score += TP_USD; tps++; pnl(); bump(sc);
      burst(food, UP, 22); floats.push({ x: food.x, y: food.y, t: now, txt: '+$' + TP_USD, c: UP });
      if (navigator.vibrate) navigator.vibrate(12);
      speed = Math.max(85, speed - 5);
      if (tps % 2 === 0 && reds.length < 12) { const r = free(); if (r) { r.t = now; reds.push(r); } }
      food = null; food = free(); if (food) food.t = now;
      if (score >= GOAL) return end(true, now);
    }
    if (sl >= 0) { reds.splice(sl, 1); loss(h, now); }   // el SL se ejecuta y desaparece
  }

  function loss(h, now) {
    score -= SL_USD; pnl(); bump(sc); if (demo) demoHit = 1;
    shake = now; flash = now;
    burst(h, DN, 26); floats.push({ x: h.x, y: h.y, t: now, txt: '−$' + SL_USD, c: DN });
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    if (score <= -MAX_LOSS) end(false, now);
  }

  function end(ok, now) {
    alive = false;
    if (ok) { rec++; setRec(rec); rc.textContent = fmt(rec); burst(snake[0], GOLD2, 60); }
    else { shake = now; flash = now; }
    if (navigator.vibrate) navigator.vibrate(ok ? [30, 40, 30, 40, 120] : [90, 50, 90]);
    setTimeout(() => {
      msg.className = 'zen-msg ' + (ok ? 'ok' : 'ko');
      msg.innerHTML = ok
        ? '<img class="zen-sello" src="' + sello.src + '" alt="Sello MDM">' +
          '<b>¡HAS APROBADO!</b><p>Aquí tienes tu prueba de fondeo de <strong>50K</strong> de MDM</p>' +
          '<span class="mono pos">' + usd(score) + '</span><small class="zen-firma">Sellado por MDM</small>' +
          '<button class="btn" id="zenAgain">Nueva prueba</button>'
        : '<b>PRUEBA SUSPENDIDA</b><p>Has llegado a la pérdida máxima de −$3.000</p>' +
          '<span class="mono neg">' + usd(score) + '</span><small>Cuenta MDM 50K</small>' +
          '<button class="btn" id="zenAgain">Otra vez</button>';
      msg.hidden = false;
      msg.querySelector('#zenAgain').onclick = start;
    }, ok ? 500 : 650);
  }

  function bump(el) { el.classList.remove('zen-bump'); void el.offsetWidth; el.classList.add('zen-bump'); }

  function burst(p, color, n) {
    const cx = (p.x + .5) * cell, cy = (p.y + .5) * cell, now = performance.now();
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, v = cell * (2 + rng() * 5);
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: now, life: 450 + rng() * 450,
        c: i % 3 ? color : GOLD2, r: cell * (.05 + rng() * .08) });
    }
  }

  /* ── render (60 fps) ───────────────────────────────────────────────────── */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (alive && now - lastStep >= speed) step(now);
    const t = alive ? Math.min(1, (now - lastStep) / speed) : 1;
    draw(now, t);
  }

  // Puntos del cuerpo en espacio "desenrollado": cada punto se coloca en la copia más cercana del anterior,
  // así el tubo es continuo aunque cruce una pared. Luego se pinta desplazado ±px para que se vea por los dos lados.
  function bodyPoints(t) {
    const pts = [];
    for (let i = 0; i < snake.length; i++) {
      const a = prev[Math.min(i, prev.length - 1)], b = snake[i];
      let ax = a.x, ay = a.y;
      if (b.x - ax > 1) ax += N; else if (ax - b.x > 1) ax -= N;
      if (b.y - ay > 1) ay += N; else if (ay - b.y > 1) ay -= N;
      let x = (ax + (b.x - ax) * t + .5) * cell, y = (ay + (b.y - ay) * t + .5) * cell;
      if (pts.length) {
        const q = pts[pts.length - 1];
        while (x - q.x > px / 2) x -= px; while (q.x - x > px / 2) x += px;
        while (y - q.y > px / 2) y -= px; while (q.y - y > px / 2) y += px;
      }
      pts.push({ x, y });
    }
    return pts;
  }

  function tube(pts, width, style, blur, glow) {
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = width; ctx.strokeStyle = style;
    if (blur) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }

  function chip(p, tp, now) {
    const age = Math.min(1, (now - (p.t || 0)) / 260), s = .4 + .6 * (1 - Math.pow(1 - age, 3));   // entra con rebote suave
    const pulse = .5 + .5 * Math.sin(now / (tp ? 260 : 420));
    const cx = (p.x + .5) * cell, cy = (p.y + .5) * cell, w = cell * .86 * s, r = cell * .24 * s;
    const col = tp ? UP : DN;
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = cell * (tp ? .5 + .5 * pulse : .25 + .2 * pulse);
    const g = ctx.createLinearGradient(cx, cy - w / 2, cx, cy + w / 2);
    g.addColorStop(0, tp ? 'rgba(52,211,153,.42)' : 'rgba(248,113,113,.38)');
    g.addColorStop(1, tp ? 'rgba(6,78,59,.55)' : 'rgba(127,29,29,.6)');
    ctx.fillStyle = g; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, cell * .07);
    ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - w / 2, w, w, r); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .9;
    ctx.font = '700 ' + (cell * .4 * s).toFixed(1) + "px 'DM Sans',sans-serif";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(tp ? 'TP' : 'SL', cx, cy + cell * .02);
    ctx.restore();
  }

  // Bulto del TP tragado: avanza de la cabeza a la cola (f = segmentos desde la cabeza)
  function bulge(sh, f) {
    const n = sh.length - 1;                              // sh va de la cola (0) a la cabeza (n)
    const k = Math.max(0, Math.min(n, n - f)), i = Math.floor(k), j = Math.min(n, i + 1), u = k - i;
    const x = sh[i].x + (sh[j].x - sh[i].x) * u, y = sh[i].y + (sh[j].y - sh[i].y) * u;
    const r = cell * (.5 - .08 * (f / Math.max(1, n)));   // se va haciendo algo más pequeño al bajar
    ctx.save();
    ctx.shadowColor = 'rgba(52,211,153,.75)'; ctx.shadowBlur = cell * .6;
    const g = ctx.createRadialGradient(x - r * .3, y - r * .35, r * .1, x, y, r);
    g.addColorStop(0, '#fff6dc'); g.addColorStop(.35, GOLD2); g.addColorStop(.75, GOLD); g.addColorStop(1, GOLD3);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = .55; ctx.fillStyle = UP;            // el TP verde se transparenta dentro
    ctx.beginPath(); ctx.roundRect(x - r * .42, y - r * .42, r * .84, r * .84, r * .2); ctx.fill();
    ctx.globalAlpha = .9; ctx.fillStyle = '#052e1f';
    ctx.font = '700 ' + (r * .5).toFixed(1) + "px 'DM Sans',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TP', x, y + r * .03);
    ctx.restore();
  }

  function head(p) {
    const r = cell * .62;
    ctx.save();
    ctx.shadowColor = alive ? 'rgba(243,217,139,.9)' : DN; ctx.shadowBlur = cell * .9;
    ctx.fillStyle = '#0b0906'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (logo.complete && logo.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r * .94, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(logo, p.x - r, p.y - r, r * 2, r * 2); ctx.restore();
    }
    const ring = ctx.createLinearGradient(p.x, p.y - r, p.x, p.y + r);
    ring.addColorStop(0, alive ? '#fff6dc' : '#fecaca'); ring.addColorStop(.6, alive ? GOLD : DN); ring.addColorStop(1, alive ? GOLD3 : '#7f1d1d');
    ctx.strokeStyle = ring; ctx.lineWidth = Math.max(2, cell * .1);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
  }

  function draw(now, t) {
    ctx.save();
    ctx.clearRect(0, 0, px, px);
    if (shake) {                                            // temblor al tocar SL
      const k = Math.max(0, 1 - (now - shake) / 380);
      if (k > 0) ctx.translate((rng() - .5) * cell * .5 * k, (rng() - .5) * cell * .5 * k);
    }
    // fondo: degradado, rejilla de puntos y logo de marca de agua
    const bg = ctx.createRadialGradient(px / 2, px * .35, px * .05, px / 2, px / 2, px * .75);
    bg.addColorStop(0, '#1a150c'); bg.addColorStop(1, '#090705');
    ctx.fillStyle = bg; ctx.fillRect(-cell, -cell, px + 2 * cell, px + 2 * cell);
    ctx.fillStyle = 'rgba(212,175,55,.10)';
    for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) { ctx.beginPath(); ctx.arc(i * cell, j * cell, cell * .035, 0, Math.PI * 2); ctx.fill(); }
    if (logo.complete && logo.naturalWidth) {
      ctx.globalAlpha = .06 + .015 * Math.sin(now / 1400); const L = px * .6; ctx.drawImage(logo, (px - L) / 2, (px - L) / 2, L, L); ctx.globalAlpha = 1;
    }

    reds.forEach(r => chip(r, false, now));
    if (food) chip(food, true, now);

    // serpiente: sombra, cuerpo dorado, brillo superior y cabeza-logo; copias desplazadas para cruzar paredes
    const body = bodyPoints(t).reverse();
    [[0, 0], [px, 0], [-px, 0], [0, px], [0, -px]].forEach(([ox, oy]) => {
      const sh = body.map(p => ({ x: p.x + ox, y: p.y + oy }));
      tube(sh, cell * .78, 'rgba(0,0,0,.55)', cell * .5, 'rgba(0,0,0,.6)');
      const g = ctx.createLinearGradient(sh[0].x, sh[0].y, sh[sh.length - 1].x, sh[sh.length - 1].y);
      g.addColorStop(0, GOLD3); g.addColorStop(.55, GOLD); g.addColorStop(1, GOLD2);
      tube(sh, cell * .66, g, alive ? cell * .35 : 0, 'rgba(212,175,55,.45)');
      tube(sh.map(p => ({ x: p.x - cell * .08, y: p.y - cell * .1 })), cell * .16, 'rgba(255,246,220,.35)', 0);
      swallows.forEach(w => bulge(sh, w.age + SWALLOW * t));
      head(sh[sh.length - 1]);
    });

    // partículas y textos flotantes
    parts = parts.filter(p => now - p.t < p.life);
    parts.forEach(p => {
      const k = (now - p.t) / p.life, dt = (now - p.t) / 1000;
      ctx.globalAlpha = 1 - k; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x + p.vx * dt, p.y + p.vy * dt + cell * 3 * dt * dt, p.r * (1 - k * .5), 0, Math.PI * 2); ctx.fill();
    });
    floats = floats.filter(f => now - f.t < 900);
    floats.forEach(f => {
      const k = (now - f.t) / 900;
      ctx.globalAlpha = 1 - k * k; ctx.fillStyle = f.c || UP;
      ctx.font = '700 ' + (cell * .5).toFixed(1) + "px 'DM Sans',sans-serif"; ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6;
      ctx.fillText(f.txt, (f.x + .5) * cell, (f.y + .1) * cell - k * cell * 1.4);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // destello rojo al tocar SL y viñeta
    if (flash) { const k = Math.max(0, 1 - (now - flash) / 500); if (k > 0) { ctx.fillStyle = 'rgba(248,113,113,' + (.35 * k) + ')'; ctx.fillRect(-cell, -cell, px + 2 * cell, px + 2 * cell); } }
    const vg = ctx.createRadialGradient(px / 2, px / 2, px * .45, px / 2, px / 2, px * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(-cell, -cell, px + 2 * cell, px + 2 * cell);
    ctx.restore();
  }

  // Solo para la demo: camino más corto al TP (cruzando paredes) esquivando SL y cola.
  function autoplay() {
    let goal = food;
    if (tps === 4 && !demoHit && reds.length) { goal = reds[0]; }           // la demo toca un SL a propósito
    const h = snake[0], block = new Set(snake.slice(0, -1).map(key).concat(reds.filter(r => r !== goal).map(key)));
    const q = [h], from = new Map([[key(h), null]]);
    while (q.length) {
      const c = q.shift();
      if (goal && c.x === goal.x && c.y === goal.y) {
        let p = c;
        while (from.get(key(p)) && key(from.get(key(p))) !== key(h)) p = from.get(key(p));
        for (const v of Object.values(D)) if (wrap(h.x + v.x) === p.x && wrap(h.y + v.y) === p.y) return v;
        return null;
      }
      for (const v of Object.values(D)) {
        const n = { x: wrap(c.x + v.x), y: wrap(c.y + v.y) };
        if (block.has(key(n)) || from.has(key(n))) continue;
        from.set(key(n), c); q.push(n);
      }
    }
    return null;
  }

  function open(opts) {
    opts = opts || {};
    demo = !!opts.demo; if (opts.rng) rng = opts.rng;
    if (!ov) build();
    ov.hidden = false; document.body.style.overflow = 'hidden';
    size(); start();
  }
  function close() { cancelAnimationFrame(raf); alive = false; if (ov) ov.hidden = true; document.body.style.overflow = ''; }

  // Estilos + botón "Antiestrés" de la cabecera
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  function bind() { const b = document.getElementById('zenBtn'); if (b && !b.dataset.zen) { b.dataset.zen = '1'; b.addEventListener('click', () => open()); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

  window.MDMzen = { open, close };
})();
