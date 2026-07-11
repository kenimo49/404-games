/*! 404 Games — whack | MIT | https://github.com/kenimo49/404-games
 * Whack-a-mole, HTTP edition: smash the 404s, spare the 200 OK. 30 seconds.
 *
 * Usage:
 *   <div data-404-game="whack"></div>
 *   <script src="whack.js"></script>
 * or programmatically: Games404.whack.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'whack';
  var W = 420, H = 330;
  var TIME = 30;
  var TILE_W = 66, TILE_H = 40;

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
    c.style.touchAction = 'manipulation';
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

  function holePos(i) {
    var col = i % 3, row = Math.floor(i / 3);
    return { x: 90 + col * 120, y: 110 + row * 88 };
  }

  function mount(root) {
    var canvas = makeCanvas(root, '404 whack mini game — smash the 404s, spare the 200s');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var holes, score, timeLeft, spawnT, flash;

    function reset() {
      holes = [];
      for (var i = 0; i < 9; i++) holes.push(null);
      score = 0; timeLeft = TIME; spawnT = 0.4; flash = null;
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    function update(dt) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; return gameOver(); }

      var progress = 1 - timeLeft / TIME;
      spawnT -= dt;
      if (spawnT <= 0) {
        var empty = [];
        for (var i = 0; i < 9; i++) if (!holes[i]) empty.push(i);
        if (empty.length) {
          var idx = empty[Math.floor(Math.random() * empty.length)];
          var isOk = Math.random() < 0.22;
          var life = Math.max(0.55, 1.05 - progress * 0.45);
          holes[idx] = { ch: isOk ? '200' : '404', t: life, total: life };
        }
        spawnT = Math.max(0.28, 0.65 - progress * 0.3) * (0.7 + Math.random() * 0.6);
      }
      for (i = 0; i < 9; i++) {
        if (holes[i]) {
          holes[i].t -= dt;
          if (holes[i].t <= 0) holes[i] = null;
        }
      }
      if (flash) {
        flash.t -= dt;
        if (flash.t <= 0) flash = null;
      }
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      for (var i = 0; i < 9; i++) drawHole(i);
      drawFlash();
      drawHud();

      if (st === 'idle') overlay('404 WHACK', '404 = +10   200 = -30');
      else if (st === 'over') overlay('TIME UP', String(score));
    }

    function drawHole(i) {
      var p = holePos(i);
      ctx.fillStyle = th.fg;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 18, 38, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      var m = holes[i];
      if (!m) return;

      // pop in/out scale
      var k = Math.min(1, (m.total - m.t) / 0.12, m.t / 0.12);
      var h = TILE_H * Math.max(0.2, k);
      var y = p.y + 14 - h;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.x - TILE_W / 2, y, TILE_W, h, 7);
      else ctx.rect(p.x - TILE_W / 2, y, TILE_W, h);
      if (m.ch === '404') {
        ctx.fillStyle = th.accent;
        ctx.fill();
        ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      } else {
        ctx.strokeStyle = th.fg;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = th.fg;
      }
      if (k > 0.5) {
        ctx.font = font(17);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.ch, p.x, y + h / 2 + 1);
      }
    }

    function drawFlash() {
      if (!flash) return;
      ctx.fillStyle = th.fg;
      ctx.globalAlpha = Math.min(1, flash.t * 4);
      ctx.font = font(15);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(flash.txt, flash.x, flash.y);
      ctx.globalAlpha = 1;
    }

    function drawHud() {
      ctx.fillStyle = th.fg;
      ctx.font = font(14);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(score), 12, 24);
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + hi, 70, 24);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = th.fg;
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(W - 132, 12, 120, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.accent;
      ctx.fillRect(W - 131, 13, 118 * (timeLeft / TIME), 8);
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.78;
      ctx.fillRect(0, H / 2 - 72, W, 144);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 - 30);
      if (sub) { ctx.font = font(14); ctx.fillText(sub, W / 2, H / 2 - 6); }
      drawPlay(ctx, W / 2, H / 2 + 34, 13);
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

    function onPointer(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }

      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W;
      var y = (e.clientY - r.top) / r.height * H;
      for (var i = 0; i < 9; i++) {
        var m = holes[i];
        if (!m) continue;
        var p = holePos(i);
        if (Math.abs(x - p.x) < TILE_W / 2 + 6 && y > p.y - TILE_H - 12 && y < p.y + 24) {
          if (m.ch === '404') { score += 10; flash = { x: p.x, y: p.y - TILE_H - 8, txt: '+10', t: 0.4 }; }
          else { score = Math.max(0, score - 30); flash = { x: p.x, y: p.y - TILE_H - 8, txt: '-30', t: 0.4 }; }
          holes[i] = null;
          return;
        }
      }
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'idle' || (st === 'over' && performance.now() - overAt > 400)) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
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
