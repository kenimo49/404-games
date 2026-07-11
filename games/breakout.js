/*! 404 Games — breakout | MIT | https://github.com/kenimo49/404-games
 * Homage to Atari Breakout: the bricks spell 404. Clear the error.
 *
 * Usage:
 *   <div data-404-game="breakout"></div>
 *   <script src="breakout.js"></script>
 * or programmatically: Games404.breakout.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'breakout';
  var W = 480, H = 360;
  var PADDLE_W = 72, PADDLE_H = 10, PADDLE_Y = H - 26;
  var BALL_R = 5;

  // 5x7 pixel glyphs — the bricks spell "404"
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

  function buildBricks() {
    // 3 digits x 5 cols + 2 gap cols = 19 columns, 7 rows
    var cols = 19, bw = 22, bh = 12, gapX = 2, gapY = 3;
    var totalW = cols * (bw + gapX) - gapX;
    var x0 = (W - totalW) / 2, y0 = 42;
    var bricks = [];
    var digits = ['4', '0', '4'];
    for (var d = 0; d < 3; d++) {
      var g = GLYPH[digits[d]];
      for (var r = 0; r < 7; r++) {
        for (var c = 0; c < 5; c++) {
          if (g[r].charAt(c) === '1') {
            var col = d * 7 + c; // 5 cols + 2 gap between digits
            bricks.push({
              x: x0 + col * (bw + gapX),
              y: y0 + r * (bh + gapY),
              w: bw, h: bh, row: r, alive: true
            });
          }
        }
      }
    }
    return bricks;
  }

  function mount(root) {
    var canvas = makeCanvas(root, '404 breakout mini game — clear the 404 bricks');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var px, bx, by, bvx, bvy, glued, bricks, lives, score, level, keyL = false, keyR = false;

    function resetBall() {
      glued = true;
      bx = px; by = PADDLE_Y - BALL_R - 1;
    }
    function launch() {
      if (!glued) return;
      glued = false;
      var sp = 250 + level * 25;
      var ang = -Math.PI / 3 + Math.random() * (Math.PI / 6);
      bvx = Math.cos(ang) * sp * (Math.random() < 0.5 ? -1 : 1);
      bvy = -Math.abs(Math.sin(ang) * sp) - 120;
      var n = Math.sqrt(bvx * bvx + bvy * bvy);
      bvx *= sp / n; bvy *= sp / n;
    }
    function reset() {
      px = W / 2; bricks = buildBricks(); lives = 3; score = 0; level = 0;
      resetBall();
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    function movePaddle(dt) {
      if (keyL) px -= 380 * dt;
      if (keyR) px += 380 * dt;
      px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, px));
    }

    function bounceWalls() {
      if (bx < BALL_R) { bx = BALL_R; bvx = Math.abs(bvx); }
      if (bx > W - BALL_R) { bx = W - BALL_R; bvx = -Math.abs(bvx); }
      if (by < BALL_R) { by = BALL_R; bvy = Math.abs(bvy); }
    }

    function bouncePaddle() {
      if (bvy > 0 && by + BALL_R > PADDLE_Y && by + BALL_R < PADDLE_Y + PADDLE_H + 8 &&
          Math.abs(bx - px) < PADDLE_W / 2 + BALL_R) {
        var off = (bx - px) / (PADDLE_W / 2); // -1..1
        var sp = Math.min(520, Math.sqrt(bvx * bvx + bvy * bvy) * 1.02);
        bvx = Math.sin(off * 1.05) * sp;
        bvy = -Math.sqrt(Math.max(sp * sp - bvx * bvx, sp * sp * 0.16));
        by = PADDLE_Y - BALL_R;
      }
    }

    function hitBricks() {
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        if (bx + BALL_R > b.x && bx - BALL_R < b.x + b.w && by + BALL_R > b.y && by - BALL_R < b.y + b.h) {
          b.alive = false;
          score += 10;
          // reflect on the axis of least penetration
          var overX = Math.min(bx + BALL_R - b.x, b.x + b.w - (bx - BALL_R));
          var overY = Math.min(by + BALL_R - b.y, b.y + b.h - (by - BALL_R));
          if (overX < overY) bvx = bx < b.x + b.w / 2 ? -Math.abs(bvx) : Math.abs(bvx);
          else bvy = by < b.y + b.h / 2 ? -Math.abs(bvy) : Math.abs(bvy);
          return;
        }
      }
    }

    function anyBricksAlive() {
      for (var i = 0; i < bricks.length; i++) if (bricks[i].alive) return true;
      return false;
    }

    function update(dt) {
      movePaddle(dt);
      if (glued) { bx = px; by = PADDLE_Y - BALL_R - 1; return; }

      bx += bvx * dt;
      by += bvy * dt;
      bounceWalls();
      bouncePaddle();
      hitBricks();

      if (!anyBricksAlive()) {
        level++;
        score += 50;
        bricks = buildBricks();
        resetBall();
      }

      if (by > H + BALL_R) {
        lives--;
        if (lives <= 0) return gameOver();
        resetBall();
      }
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // bricks
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.55 + 0.45 * (b.row / 6);
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      ctx.globalAlpha = 1;

      // paddle + ball
      ctx.fillStyle = th.fg;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(px - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, 4);
        ctx.fill();
      } else ctx.fillRect(px - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);
      ctx.beginPath();
      ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.font = font(13);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(score), 10, 20);
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + hi, 10 + 70, 20);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'right';
      var hearts = '';
      for (i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillText(hearts.trim(), W - 10, 20);

      if (st === 'idle') overlay('404 BREAKOUT', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, H / 2 - 40, W, 130);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2);
      if (sub) { ctx.font = font(15); ctx.fillText(sub, W / 2, H / 2 + 24); }
      drawPlay(ctx, W / 2, H / 2 + 58, 13);
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
      if (st === 'idle') { start(); return; }
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, pointerX(e)));
      launch();
    }
    function onPointerMove(e) {
      if (st !== 'run') return;
      px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, pointerX(e)));
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keyL = e.type === 'keydown'; e.preventDefault(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keyR = e.type === 'keydown'; e.preventDefault(); }
      else if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (st === 'idle') start();
        else if (st === 'run') launch();
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
