/*! 404 Games — asteroids | MIT | https://github.com/kenimo49/404-games
 * Homage to Asteroids: blast the drifting 4s and 0s before they sink your ship.
 *
 * Usage:
 *   <div data-404-game="asteroids"></div>
 *   <script src="asteroids.js"></script>
 * or programmatically: Games404.asteroids.mount(element)
 *
 * Controls: arrows rotate/thrust + Space fires. Touch: drag to steer, tap to fire.
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'asteroids';
  var W = 480, H = 360;
  var SIZES = [0, 10, 17, 27]; // radius by tier

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
    // keyboard-only focus ring: pointer interactions keep the canvas clean
    c.addEventListener('pointerdown', function () { c.g404PointerDown = true; });
    c.addEventListener('focus', function () {
      if (!c.g404PointerDown) c.style.outline = '2px solid currentColor';
      c.g404PointerDown = false;
    });
    c.addEventListener('blur', function () { c.style.outline = 'none'; });
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
  /* overlay/eye contrast: with no --g404-bg, pick black/white from fg luminance
     (a light fg means a dark page, so the overlay box must be dark too) */
  function overlayBg(ctx, th) {
    if (th.bg !== 'transparent') return th.bg;
    ctx.save();
    ctx.fillStyle = th.fg;
    var norm = String(ctx.fillStyle);
    ctx.restore();
    var r = 255, g = 255, b = 255;
    var m = /^#([0-9a-f]{6})/i.exec(norm);
    if (m) {
      r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16);
    } else {
      m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(norm);
      if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
    }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 140 ? '#111418' : '#ffffff';
  }
  // screen-reader announcement (aria-live) for game-over states
  function announce(root, msg) {
    var el = root.g404Live;
    if (!el) {
      el = document.createElement('span');
      el.setAttribute('aria-live', 'polite');
      el.style.position = 'absolute';
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.overflow = 'hidden';
      el.style.clip = 'rect(0 0 0 0)';
      root.appendChild(el);
      root.g404Live = el;
    }
    el.textContent = msg;
  }
  /* ---- end shared kit ---- */

  function wrap(v, max) { return v < 0 ? v + max : v > max ? v - max : v; }

  function mount(root) {
    var canvas = makeCanvas(root, '404 asteroids mini game — blast the drifting digits');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0, idleT = 1, drawnSt = '';

    var ship, rocks, bullets, score, lives, waveN, coolT, invulnT;
    var keyL = false, keyR = false, keyUp = false;
    var aimX = null, aimY = null, steering = false;

    function spawnRocks(n) {
      var list = [];
      for (var i = 0; i < n; i++) {
        // spawn along the edges, away from the ship
        var x = Math.random() < 0.5 ? Math.random() * W : (Math.random() < 0.5 ? 0 : W);
        var y = x === 0 || x === W ? Math.random() * H : (Math.random() < 0.5 ? 0 : H);
        var a = Math.random() * Math.PI * 2;
        var sp = 35 + Math.random() * 45 + waveN * 8;
        list.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          tier: 3, ch: Math.random() < 0.6 ? '4' : '0',
          rot: (Math.random() - 0.5) * 2, ang: Math.random() * Math.PI * 2
        });
      }
      return list;
    }
    function reset() {
      ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0 };
      waveN = 0;
      rocks = spawnRocks(4);
      bullets = []; score = 0; lives = 3; coolT = 0; invulnT = 2;
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      announce(root, 'game over. score ' + score);
      if (score > hi) { hi = score; saveHi(hi); }
    }
    function fire() {
      if (coolT > 0 || bullets.length >= 4) return;
      bullets.push({
        x: ship.x + Math.cos(ship.a) * 12, y: ship.y + Math.sin(ship.a) * 12,
        vx: Math.cos(ship.a) * 400 + ship.vx, vy: Math.sin(ship.a) * 400 + ship.vy,
        t: 1.0
      });
      coolT = 0.22;
    }
    function hitShip() {
      lives--;
      if (lives <= 0) return gameOver();
      ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0;
      invulnT = 2;
    }

    // steering: keyboard, or pointer-drag aiming
    function steer(dt) {
      if (keyL) ship.a -= 3.8 * dt;
      if (keyR) ship.a += 3.8 * dt;
      var thrust = keyUp;
      if (steering && aimX !== null) {
        var want = Math.atan2(aimY - ship.y, aimX - ship.x);
        var diff = Math.atan2(Math.sin(want - ship.a), Math.cos(want - ship.a));
        ship.a += Math.max(-4.5 * dt, Math.min(4.5 * dt, diff));
        var d2 = (aimX - ship.x) * (aimX - ship.x) + (aimY - ship.y) * (aimY - ship.y);
        if (d2 > 55 * 55) thrust = true;
      }
      if (thrust) {
        ship.vx += Math.cos(ship.a) * 230 * dt;
        ship.vy += Math.sin(ship.a) * 230 * dt;
      }
      var damp = Math.pow(0.45, dt);
      ship.vx *= damp; ship.vy *= damp;
      var vmax = 280, vlen = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (vlen > vmax) { ship.vx *= vmax / vlen; ship.vy *= vmax / vlen; }
      ship.x = wrap(ship.x + ship.vx * dt, W);
      ship.y = wrap(ship.y + ship.vy * dt, H);
    }

    function updateBullets(dt) {
      for (var i = bullets.length - 1; i >= 0; i--) {
        var b = bullets[i];
        b.t -= dt;
        if (b.t <= 0) { bullets.splice(i, 1); continue; }
        b.x = wrap(b.x + b.vx * dt, W);
        b.y = wrap(b.y + b.vy * dt, H);
      }
    }

    // first bullet inside the rock is consumed; true = hit
    function hitByBullet(rk) {
      var rr = SIZES[rk.tier];
      for (var j = bullets.length - 1; j >= 0; j--) {
        var dx = bullets[j].x - rk.x, dy = bullets[j].y - rk.y;
        if (dx * dx + dy * dy < rr * rr) {
          bullets.splice(j, 1);
          return true;
        }
      }
      return false;
    }

    function splitRock(rk) {
      score += rk.tier === 3 ? 20 : rk.tier === 2 ? 50 : 100;
      if (rk.tier <= 1) return;
      for (var k = 0; k < 2; k++) {
        var a = Math.random() * Math.PI * 2;
        var sp = 55 + Math.random() * 65;
        rocks.push({
          x: rk.x, y: rk.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          tier: rk.tier - 1, ch: Math.random() < 0.5 ? '4' : '0',
          rot: (Math.random() - 0.5) * 3, ang: Math.random() * Math.PI * 2
        });
      }
    }

    // false = the ship was destroyed mid-loop (game over)
    function updateRocks(dt) {
      for (var i = rocks.length - 1; i >= 0; i--) {
        var rk = rocks[i];
        rk.x = wrap(rk.x + rk.vx * dt, W);
        rk.y = wrap(rk.y + rk.vy * dt, H);
        rk.ang += rk.rot * dt;

        if (hitByBullet(rk)) {
          splitRock(rk);
          rocks.splice(i, 1);
          continue;
        }
        if (invulnT <= 0) {
          var sx = ship.x - rk.x, sy = ship.y - rk.y;
          var range = SIZES[rk.tier] * 0.8 + 8;
          if (sx * sx + sy * sy < range * range) {
            hitShip();
            if (st !== 'run') return false;
          }
        }
      }
      return true;
    }

    function nextWave() {
      waveN++;
      score += 100;
      rocks = spawnRocks(4 + Math.min(3, waveN));
      invulnT = Math.max(invulnT, 1.2);
    }

    function update(dt) {
      coolT -= dt;
      if (invulnT > 0) invulnT -= dt;
      steer(dt);
      updateBullets(dt);
      if (!updateRocks(dt)) return;
      if (!rocks.length) nextWave();
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // rocks: drifting rotating digits
      ctx.fillStyle = th.accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var i = 0; i < rocks.length; i++) {
        var rk = rocks[i];
        ctx.save();
        ctx.translate(rk.x, rk.y);
        ctx.rotate(rk.ang);
        ctx.font = font(SIZES[rk.tier] * 2);
        ctx.fillText(rk.ch, 0, 1);
        ctx.restore();
      }

      // ship (blink while invulnerable)
      if (st !== 'idle' && (invulnT <= 0 || Math.floor(invulnT * 8) % 2 === 0)) {
        ctx.strokeStyle = th.fg;
        ctx.fillStyle = th.fg;
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.a);
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-9, 8);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-9, -8);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // bullets
      ctx.fillStyle = th.fg;
      for (i = 0; i < bullets.length; i++) ctx.fillRect(bullets[i].x - 1.5, bullets[i].y - 1.5, 3, 3);

      // HUD
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

      if (st === 'idle') overlay('404 ASTEROIDS', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function overlay(title, sub) {
      ctx.fillStyle = overlayBg(ctx, th);
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, H / 2 - 66, W, 132);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 - 26);
      if (sub) { ctx.font = font(15); ctx.fillText(sub, W / 2, H / 2 - 2); }
      drawPlay(ctx, W / 2, H / 2 + 34, 13);
    }

    function loop(t) {
      if (destroyed) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      themeT += dt;
      if (themeT > 1) { themeT = 0; th = readTheme(root); }
      if (st === 'run') update(dt);
      // idle/over scenes are static: redraw at ~4fps unless the state just changed
      idleT += dt;
      if (st === 'run' || st !== drawnSt || idleT > 0.25) {
        idleT = 0;
        drawnSt = st;
        draw();
      }
      raf = requestAnimationFrame(loop);
    }

    function pointerXY(e) {
      var r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    }
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      var p = pointerXY(e);
      aimX = p[0]; aimY = p[1];
      steering = true;
      if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
      fire();
    }
    function onPointerMove(e) {
      if (st !== 'run' || !steering) return;
      var p = pointerXY(e);
      aimX = p[0]; aimY = p[1];
    }
    function onPointerUp() { steering = false; }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keyL = e.type === 'keydown'; e.preventDefault(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keyR = e.type === 'keydown'; e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') { keyUp = e.type === 'keydown'; e.preventDefault(); }
      else if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (st === 'idle') start();
        else if (st === 'run') fire();
        else if (performance.now() - overAt > 400) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    canvas.addEventListener('blur', function () { keyL = keyR = keyUp = false; }); // held keys must not survive focus loss
    raf = requestAnimationFrame(loop);

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        var cw = Math.max(1, canvas.clientWidth || W);
        var dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(cw * (H / W) * dpr);
        idleT = 1;
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
