/*! 404 Games — snake | MIT | https://github.com/kenimo49/404-games
 * Homage to the classic Nokia / Google snake: eat the zeros, don't eat yourself.
 *
 * Usage:
 *   <div data-404-game="snake"></div>
 *   <script src="snake.js"></script>
 * or programmatically: Games404.snake.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'snake';
  var GRID = 18, CELL = 20;
  var W = GRID * CELL, H = GRID * CELL;

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

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right'
  };
  function opposite(a, b) { return DIRS[a][0] === -DIRS[b][0] && DIRS[a][1] === -DIRS[b][1]; }

  function mount(root) {
    var canvas = makeCanvas(root, '404 snake mini game — eat the zeros');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0, idleT = 1, drawnSt = '';

    var body, dir, queue, food, score, stepT, stepDur, won = false;
    var swipeX = 0, swipeY = 0, swiping = false;

    function placeFood() {
      if (body.length >= GRID * GRID) return null; // board is full — nothing left to eat
      while (true) {
        var f = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
        var clash = false;
        for (var i = 0; i < body.length; i++) {
          if (body[i][0] === f[0] && body[i][1] === f[1]) { clash = true; break; }
        }
        if (!clash) return f;
      }
    }

    function reset() {
      var c = Math.floor(GRID / 2);
      body = [[c - 2, c], [c - 1, c], [c, c]]; // tail ... head
      dir = 'right';
      queue = [];
      score = 0;
      stepT = 0;
      stepDur = 1 / 7;
      won = false;
      food = placeFood();
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      announce(root, (won ? 'you win. score ' : 'game over. score ') + score);
      if (score > hi) { hi = score; saveHi(hi); }
    }
    function win() {
      won = true;
      gameOver();
    }

    function step() {
      if (queue.length) {
        var next = queue.shift();
        if (!opposite(next, dir)) dir = next;
      }
      var head = body[body.length - 1];
      var nx = head[0] + DIRS[dir][0];
      var ny = head[1] + DIRS[dir][1];
      if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) return gameOver();
      for (var i = 1; i < body.length; i++) { // index 0 (tail tip) moves away this step
        if (body[i][0] === nx && body[i][1] === ny) return gameOver();
      }
      body.push([nx, ny]);
      if (food && nx === food[0] && ny === food[1]) {
        score += 10;
        stepDur = Math.max(1 / 16, stepDur * 0.965);
        food = placeFood();
        if (!food) return win(); // the snake filled the whole board
      } else {
        body.shift();
      }
    }

    function update(dt) {
      stepT += dt;
      while (stepT >= stepDur && st === 'run') { stepT -= stepDur; step(); }
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // frame
      ctx.strokeStyle = th.fg;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      ctx.globalAlpha = 1;

      // food: a zero
      if (food) {
        ctx.fillStyle = th.accent;
        ctx.font = font(CELL - 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('0', food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2 + 1);
      }

      // snake
      ctx.fillStyle = th.fg;
      for (var i = 0; i < body.length; i++) {
        var pad = i === body.length - 1 ? 1 : 2;
        ctx.fillRect(body[i][0] * CELL + pad, body[i][1] * CELL + pad, CELL - pad * 2, CELL - pad * 2);
      }
      // eye on head
      var head = body[body.length - 1];
      ctx.fillStyle = overlayBg(ctx, th);
      ctx.fillRect(head[0] * CELL + CELL / 2 - 2, head[1] * CELL + CELL / 2 - 2, 4, 4);

      // score
      ctx.fillStyle = th.fg;
      ctx.font = font(13);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + hi, W - 66, 18);
      ctx.globalAlpha = 1;
      ctx.fillText(String(score), W - 10, 18);

      if (st === 'idle') overlay('404 SNAKE', null);
      else if (st === 'over') overlay(won ? 'YOU WIN' : 'GAME OVER', String(score));
    }

    function overlay(title, sub) {
      ctx.fillStyle = overlayBg(ctx, th);
      ctx.globalAlpha = 0.72;
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

    function pushDir(d) {
      var lastDir = queue.length ? queue[queue.length - 1] : dir;
      if (d !== lastDir && !opposite(d, lastDir) && queue.length < 3) queue.push(d);
    }
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
      swiping = true; swipeX = e.clientX; swipeY = e.clientY;
    }
    function onPointerMove(e) {
      if (!swiping || st !== 'run') return;
      var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
      if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
      pushDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      swipeX = e.clientX; swipeY = e.clientY;
    }
    function onPointerUp() { swiping = false; }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (KEYS[e.code] && st === 'run') {
        e.preventDefault();
        pushDir(KEYS[e.code]);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'idle' || (st === 'over' && performance.now() - overAt > 400)) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', onKey);
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
