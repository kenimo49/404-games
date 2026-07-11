/*! 404 Games — invaders | MIT | https://github.com/kenimo49/404-games
 * Homage to Kualo's legendary Space Invaders 404 page: shoot the 404 apart.
 *
 * Usage:
 *   <div data-404-game="invaders"></div>
 *   <script src="invaders.js"></script>
 * or programmatically: Games404.invaders.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'invaders';
  var W = 480, H = 360;
  var SHIP_Y = H - 26, SHIP_W = 28, SHIP_H = 12;

  // 5x7 pixel glyphs — the invader formation spells "404"
  var GLYPH = {
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110']
  };

  /* ---- shared kit (duplicated in every game file so each stays standalone) ---- */
  function readTheme(el) {
    var cs = window.getComputedStyle(el);
    function v(n, f) { var x = cs.getPropertyValue(n); x = x && x.trim(); return x || f; }
    var fg = v('--g404-fg', cs.color || '#1f2937');
    return { fg: fg, bg: v('--g404-bg', 'transparent'), accent: v('--g404-accent', fg) };
  }
  function loadHi() { try { return Math.max(0, parseInt(localStorage.getItem('g404:hi:' + NAME), 10) || 0); } catch (e) { return 0; } }
  function saveHi(s) { try { localStorage.setItem('g404:hi:' + NAME, String(s)); } catch (e) {} }
  function makeCanvas(root, label) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.style.display = 'block';
    c.style.width = '100%';
    c.style.maxWidth = W + 'px';
    c.style.margin = '0 auto';
    c.style.touchAction = 'none';
    c.style.outline = 'none';
    c.style.cursor = 'pointer';
    c.setAttribute('tabindex', '0');
    c.setAttribute('role', 'application');
    c.setAttribute('aria-label', label);
    root.appendChild(c);
    return c;
  }
  function font(px) { return '700 ' + px + 'px ui-monospace, Menlo, Consolas, monospace'; }
  function drawPlay(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, y - r);
    ctx.lineTo(x - r * 0.6, y + r);
    ctx.lineTo(x + r, y);
    ctx.closePath();
    ctx.fill();
  }
  /* ---- end shared kit ---- */

  function buildWave() {
    // 19 columns (5+2gap+5+2gap+5) x 7 rows of cells; filled cells are invaders
    var cellW = 22, cellH = 17;
    var totalW = 19 * cellW;
    var x0 = (W - totalW) / 2;
    var list = [];
    var digits = ['4', '0', '4'];
    for (var d = 0; d < 3; d++) {
      var g = GLYPH[digits[d]];
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < 5; c++) {
          if (g[r].charAt(c) === '1') {
            list.push({ ox: x0 + (d * 7 + c) * cellW + cellW / 2, oy: 44 + r * cellH, alive: true, col: d * 7 + c });
          }
        }
      }
    }
    return list;
  }

  function mount(root) {
    var canvas = makeCanvas(root, '404 invaders mini game — shoot the 404 apart');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var shipX, invaders, offX, offY, dirX, shots, bombs, bombT, score, lives, wave, anim, keyL = false, keyR = false, coolT;

    function reset() {
      shipX = W / 2;
      invaders = buildWave();
      offX = 0; offY = 0; dirX = 1;
      shots = []; bombs = []; bombT = 1.4;
      score = 0; lives = 3; wave = 0; anim = 0; coolT = 0;
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }
    function fire() {
      if (coolT > 0 || shots.length >= 2) return;
      shots.push({ x: shipX, y: SHIP_Y - SHIP_H });
      coolT = 0.28;
    }
    function aliveCount() {
      var n = 0;
      for (var i = 0; i < invaders.length; i++) if (invaders[i].alive) n++;
      return n;
    }

    // formation march; true = invaders reached the ship line
    function march(dt, alive, total) {
      var speed = (16 + wave * 6) * (1 + 2.6 * (1 - alive / total));
      offX += dirX * speed * dt;
      var minX = 1e9, maxX = -1e9, maxY = -1e9;
      for (var i = 0; i < invaders.length; i++) {
        var inv = invaders[i];
        if (!inv.alive) continue;
        minX = Math.min(minX, inv.ox + offX);
        maxX = Math.max(maxX, inv.ox + offX);
        maxY = Math.max(maxY, inv.oy + offY);
      }
      if (maxX > W - 16 && dirX > 0) { dirX = -1; offY += 10; }
      else if (minX < 16 && dirX < 0) { dirX = 1; offY += 10; }
      return maxY > SHIP_Y - 18;
    }

    function updateShots(dt) {
      for (var i = shots.length - 1; i >= 0; i--) {
        shots[i].y -= 380 * dt;
        if (shots[i].y < -10) { shots.splice(i, 1); continue; }
        for (var j = 0; j < invaders.length; j++) {
          var v = invaders[j];
          if (!v.alive) continue;
          if (Math.abs(shots[i].x - (v.ox + offX)) < 9 && Math.abs(shots[i].y - (v.oy + offY)) < 8) {
            v.alive = false;
            score += 10;
            shots.splice(i, 1);
            break;
          }
        }
      }
    }

    // a random bottom-most invader drops one bomb
    function dropBomb(alive, total) {
      var shooters = {};
      for (var i = 0; i < invaders.length; i++) {
        var u = invaders[i];
        if (!u.alive) continue;
        if (!(u.col in shooters) || invaders[shooters[u.col]].oy < u.oy) shooters[u.col] = i;
      }
      var keys = Object.keys(shooters);
      if (keys.length) {
        var pick = invaders[shooters[keys[Math.floor(Math.random() * keys.length)]]];
        bombs.push({ x: pick.ox + offX, y: pick.oy + offY + 8 });
      }
      bombT = Math.max(0.5, 1.5 - wave * 0.15 - (1 - alive / total) * 0.5) * (0.6 + Math.random() * 0.8);
    }

    // true = the ship ran out of lives
    function updateBombs(dt, alive, total) {
      bombT -= dt;
      if (bombT <= 0) dropBomb(alive, total);
      for (var i = bombs.length - 1; i >= 0; i--) {
        bombs[i].y += (150 + wave * 18) * dt;
        if (bombs[i].y > H + 10) { bombs.splice(i, 1); continue; }
        if (Math.abs(bombs[i].x - shipX) < SHIP_W / 2 && bombs[i].y > SHIP_Y - SHIP_H && bombs[i].y < SHIP_Y + 6) {
          bombs.splice(i, 1);
          lives--;
          if (lives <= 0) return true;
        }
      }
      return false;
    }

    function nextWave() {
      wave++;
      score += 100;
      invaders = buildWave();
      offX = 0; offY = 0; dirX = 1;
      bombs = [];
    }

    function update(dt) {
      anim += dt;
      coolT -= dt;
      if (keyL) shipX -= 300 * dt;
      if (keyR) shipX += 300 * dt;
      shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, shipX));

      var alive = aliveCount(), total = invaders.length;
      if (march(dt, alive, total)) return gameOver();
      updateShots(dt);
      if (updateBombs(dt, alive, total)) return gameOver();
      if (alive === 0) nextWave();
    }

    function drawInvader(x, y, frame) {
      // tiny 11x8 pixel alien, 2 animation frames
      var px = 1.6;
      ctx.save();
      ctx.translate(x - 5.5 * px, y - 4 * px);
      var rows = frame
        ? ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000']
        : ['00100000100', '10010001001', '10111111101', '11101110111', '11111111111', '01111111110', '00100000100', '01000000010'];
      for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < 11; c++) {
          if (rows[r].charAt(c) === '1') ctx.fillRect(c * px, r * px, px, px);
        }
      }
      ctx.restore();
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // invaders
      ctx.fillStyle = th.accent;
      var frame = Math.floor(anim * 2) % 2;
      for (var i = 0; i < invaders.length; i++) {
        var v = invaders[i];
        if (v.alive) drawInvader(v.ox + offX, v.oy + offY, frame);
      }

      // ship
      ctx.fillStyle = th.fg;
      ctx.beginPath();
      ctx.moveTo(shipX, SHIP_Y - SHIP_H);
      ctx.lineTo(shipX - SHIP_W / 2, SHIP_Y + 4);
      ctx.lineTo(shipX + SHIP_W / 2, SHIP_Y + 4);
      ctx.closePath();
      ctx.fill();

      // shots + bombs
      for (i = 0; i < shots.length; i++) ctx.fillRect(shots[i].x - 1.5, shots[i].y - 6, 3, 8);
      ctx.fillStyle = th.accent;
      for (i = 0; i < bombs.length; i++) ctx.fillRect(bombs[i].x - 2, bombs[i].y - 4, 4, 7);

      // HUD
      ctx.fillStyle = th.fg;
      ctx.font = font(13);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(score), 10, 20);
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + hi, 80, 20);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'right';
      var hearts = '';
      for (i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillText(hearts.trim(), W - 10, 20);

      if (st === 'idle') overlay('404 INVADERS', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, H / 2 - 20, W, 120);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 + 16);
      if (sub) { ctx.font = font(15); ctx.fillText(sub, W / 2, H / 2 + 40); }
      drawPlay(ctx, W / 2, H / 2 + 72, 13);
    }

    function loop(t) {
      if (destroyed) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      themeT += dt;
      if (themeT > 1) { themeT = 0; th = readTheme(root); }
      if (st === 'run') update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    function pointerX(e) {
      var r = canvas.getBoundingClientRect();
      return (e.clientX - r.left) / r.width * W;
    }
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, pointerX(e)));
      fire();
    }
    function onPointerMove(e) {
      if (st !== 'run') return;
      if (e.pointerType === 'mouse' || e.buttons > 0) {
        shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, pointerX(e)));
      }
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keyL = e.type === 'keydown'; e.preventDefault(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keyR = e.type === 'keydown'; e.preventDefault(); }
      else if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (st === 'idle') start();
        else if (st === 'run') fire();
        else if (performance.now() - overAt > 400) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    raf = requestAnimationFrame(loop);

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        var cw = Math.max(1, canvas.clientWidth || W);
        var dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(cw * (H / W) * dpr);
      });
      ro.observe(canvas);
    }

    return {
      destroy: function () {
        destroyed = true;
        cancelAnimationFrame(raf);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKey);
        if (ro) ro.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.Games404 = window.Games404 || {};
  window.Games404[NAME] = { name: NAME, mount: mount };
  function auto() {
    var els = document.querySelectorAll('[data-404-game]');
    for (var i = 0; i < els.length; i++) {
      var v = els[i].getAttribute('data-404-game');
      if ((v === NAME || v === '') && !els[i].g404Mounted) {
        els[i].g404Mounted = true;
        mount(els[i]);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
