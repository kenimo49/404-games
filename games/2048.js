/*! 404 Games — 2048 | MIT | https://github.com/kenimo49/404-games
 * Homage to Gabriele Cirulli's 2048: slide, merge, and forget you ever hit a 404.
 *
 * Usage:
 *   <div data-404-game="2048"></div>
 *   <script src="2048.js"></script>
 * or programmatically: Games404['2048'].mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = '2048';
  var BOARD = 360, HEAD = 46;
  var W = BOARD, H = BOARD + HEAD;
  var N = 4, PAD = 9;
  var CELL = (BOARD - PAD * (N + 1)) / N;

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
    var canvas = makeCanvas(root, '404 2048 mini game — slide and merge the tiles');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var grid, score, popT;
    var swipeX = 0, swipeY = 0, swipeOn = false;

    function addTile() {
      var empty = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      var p = empty[Math.floor(Math.random() * empty.length)];
      grid[p[0]][p[1]] = Math.random() < 0.9 ? 2 : 4;
    }
    function reset() {
      grid = [];
      for (var r = 0; r < N; r++) { grid.push([0, 0, 0, 0]); }
      score = 0; popT = 0;
      addTile(); addTile();
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    // slide one row toward index 0; returns gained points, mutates line
    function slide(line) {
      var vals = [];
      for (var i = 0; i < N; i++) if (line[i]) vals.push(line[i]);
      var out = [], gained = 0;
      for (i = 0; i < vals.length; i++) {
        if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
          out.push(vals[i] * 2);
          gained += vals[i] * 2;
          i++;
        } else out.push(vals[i]);
      }
      while (out.length < N) out.push(0);
      var moved = false;
      for (i = 0; i < N; i++) {
        if (line[i] !== out[i]) moved = true;
        line[i] = out[i];
      }
      return { gained: gained, moved: moved };
    }

    function move(dir) { // 0=left 1=right 2=up 3=down
      var moved = false, gained = 0, r, c, line, res;
      for (var k = 0; k < N; k++) {
        line = [];
        for (var i = 0; i < N; i++) {
          if (dir === 0) { r = k; c = i; }
          else if (dir === 1) { r = k; c = N - 1 - i; }
          else if (dir === 2) { r = i; c = k; }
          else { r = N - 1 - i; c = k; }
          line.push(grid[r][c]);
        }
        res = slide(line);
        moved = moved || res.moved;
        gained += res.gained;
        for (i = 0; i < N; i++) {
          if (dir === 0) { r = k; c = i; }
          else if (dir === 1) { r = k; c = N - 1 - i; }
          else if (dir === 2) { r = i; c = k; }
          else { r = N - 1 - i; c = k; }
          grid[r][c] = line[i];
        }
      }
      if (moved) {
        score += gained;
        addTile();
        popT = 0.12;
        if (!canMove()) gameOver();
      }
    }

    function canMove() {
      for (var r = 0; r < N; r++) {
        for (var c = 0; c < N; c++) {
          if (!grid[r][c]) return true;
          if (c + 1 < N && grid[r][c] === grid[r][c + 1]) return true;
          if (r + 1 < N && grid[r][c] === grid[r + 1][c]) return true;
        }
      }
      return false;
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // header
      ctx.fillStyle = th.fg;
      ctx.font = font(16);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(score), 12, 30);
      ctx.globalAlpha = 0.6;
      ctx.textAlign = 'right';
      ctx.fillText('HI ' + hi, W - 12, 30);
      ctx.globalAlpha = 1;

      // board frame
      ctx.strokeStyle = th.fg;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(0.5, HEAD + 0.5, W - 1, BOARD - 1);
      ctx.globalAlpha = 1;

      for (var r = 0; r < N; r++) {
        for (var c = 0; c < N; c++) drawCell(r, c);
      }

      if (st === 'idle') overlay('404 2048', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function cellRect(x, y) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, CELL, CELL, 6);
      else ctx.rect(x, y, CELL, CELL);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawCell(r, c) {
      var x = PAD + c * (CELL + PAD);
      var y = HEAD + PAD + r * (CELL + PAD);
      // empty cell
      ctx.fillStyle = th.fg;
      ctx.globalAlpha = 0.07;
      cellRect(x, y);

      var v = grid[r][c];
      if (!v) return;
      var mag = Math.log(v) / Math.LN2; // 1..11+
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = Math.min(0.95, 0.16 + mag * 0.08);
      cellRect(x, y);
      ctx.fillStyle = th.fg;
      var fs = v < 100 ? 30 : v < 1000 ? 26 : 21;
      ctx.font = font(fs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 2);
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.78;
      ctx.fillRect(0, H / 2 - 70, W, 140);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 - 28);
      if (sub) { ctx.font = font(15); ctx.fillText(sub, W / 2, H / 2 - 4); }
      drawPlay(ctx, W / 2, H / 2 + 34, 13);
    }

    function loop(t) {
      if (destroyed) return;
      var dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      themeT += dt;
      if (themeT > 1) { themeT = 0; th = readTheme(root); }
      if (popT > 0) popT -= dt;
      draw();
      raf = requestAnimationFrame(loop);
    }

    var DIRKEYS = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, KeyA: 0, KeyD: 1, KeyW: 2, KeyS: 3 };
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      swipeOn = true; swipeX = e.clientX; swipeY = e.clientY;
    }
    function onPointerUp(e) {
      if (!swipeOn || st !== 'run') { swipeOn = false; return; }
      swipeOn = false;
      var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 3 : 2));
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (st === 'run' && e.code in DIRKEYS) {
        e.preventDefault();
        move(DIRKEYS[e.code]);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'idle' || (st === 'over' && performance.now() - overAt > 400)) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
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
