/*! 404 Games — flappy | MIT | https://github.com/kenimo49/404-games
 * Homage to Flappy Bird: flap through the gaps between the 404 pipes.
 *
 * Usage:
 *   <div data-404-game="flappy"></div>
 *   <script src="flappy.js"></script>
 * or programmatically: Games404.flappy.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'flappy';
  var W = 360, H = 480;
  var GROUND = H - 30;
  var PIPE_W = 54;

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

  function mount(root) {
    var canvas = makeCanvas(root, '404 flappy mini game — fly between the pipes');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var by, bv, pipes, score, spawnT, digits = ['4', '0', '4'], digitIdx;

    function reset() {
      by = H / 2; bv = 0;
      pipes = []; score = 0; spawnT = 0.2; digitIdx = 0;
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function flap() { bv = -330; }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    function update(dt) {
      bv += 1150 * dt;
      by += bv * dt;
      if (by < 12) { by = 12; bv = 0; }
      if (by > GROUND - 12) return gameOver();

      spawnT -= dt;
      if (spawnT <= 0) {
        var gap = Math.max(122, 165 - score * 1.6);
        var cy = 70 + gap / 2 + Math.random() * (GROUND - 140 - gap);
        pipes.push({ x: W + PIPE_W, cy: cy, gap: gap, ch: digits[digitIdx], passed: false });
        digitIdx = (digitIdx + 1) % digits.length;
        spawnT = 1.55;
      }

      var speed = 135 + Math.min(60, score * 1.5);
      for (var i = pipes.length - 1; i >= 0; i--) {
        var p = pipes[i];
        p.x -= speed * dt;
        if (!p.passed && p.x + PIPE_W < 92 - 12) { p.passed = true; score++; }
        if (p.x + PIPE_W < -10) pipes.splice(i, 1);
        // collision: bird circle at (92, by) r=11 vs pipe rects
        if (92 + 10 > p.x && 92 - 10 < p.x + PIPE_W) {
          if (by - 10 < p.cy - p.gap / 2 || by + 10 > p.cy + p.gap / 2) return gameOver();
        }
      }
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // pipes with their digit
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.85;
      for (var i = 0; i < pipes.length; i++) {
        var p = pipes[i];
        var top = p.cy - p.gap / 2, bot = p.cy + p.gap / 2;
        ctx.fillRect(p.x, 0, PIPE_W, top);
        ctx.fillRect(p.x - 4, top - 14, PIPE_W + 8, 14);
        ctx.fillRect(p.x, bot, PIPE_W, GROUND - bot);
        ctx.fillRect(p.x - 4, bot, PIPE_W + 8, 14);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.font = font(22);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (i = 0; i < pipes.length; i++) {
        var q = pipes[i];
        var topQ = q.cy - q.gap / 2;
        if (topQ > 34) ctx.fillText(q.ch, q.x + PIPE_W / 2, topQ - 22);
      }

      // ground
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 1);
      ctx.lineTo(W, GROUND + 1);
      ctx.stroke();

      // bird: round blob with wing + eye
      ctx.fillStyle = th.fg;
      ctx.beginPath();
      ctx.arc(92, by, 11, 0, Math.PI * 2);
      ctx.fill();
      var wingUp = st === 'run' && bv < 0;
      ctx.beginPath();
      ctx.ellipse(86, by + (wingUp ? -4 : 4), 6, 3.5, wingUp ? -0.5 : 0.5, 0, Math.PI * 2);
      ctx.fillStyle = th.accent;
      ctx.fill();
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.fillRect(96, by - 5, 3.5, 3.5);

      // score
      ctx.fillStyle = th.fg;
      ctx.font = font(26);
      ctx.textAlign = 'center';
      if (st !== 'idle') ctx.fillText(String(score), W / 2, 46);

      if (st === 'idle') overlay('404 FLAPPY', null);
      else if (st === 'over') overlay('GAME OVER', score + '  (HI ' + hi + ')');
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, H / 2 - 76, W, 152);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 - 32);
      if (sub) { ctx.font = font(14); ctx.fillText(sub, W / 2, H / 2 - 8); }
      drawPlay(ctx, W / 2, H / 2 + 32, 13);
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
      if (st === 'idle') { start(); flap(); }
      else if (st === 'run') flap();
      else if (performance.now() - overAt > 400) start();
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'run') flap();
        else if (st === 'idle') { start(); flap(); }
        else if (performance.now() - overAt > 400) start();
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
