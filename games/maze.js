/*! 404 Games — maze | MIT | https://github.com/kenimo49/404-games
 * Homage to the classic arcade dot-muncher: clear the maze, dodge the ghosts.
 *
 * Usage:
 *   <div data-404-game="maze"></div>
 *   <script src="maze.js"></script>
 * or programmatically: Games404.maze.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'maze';
  var CELL = 26, HUD = 26;
  var MAP = [
    '###############',
    '#.....#.#.....#',
    '#.###.#.#.###.#',
    '#.#.........#.#',
    '#.#.##.#.##.#.#',
    '#......#......#',
    '#.##.#   #.##.#',
    '#......#......#',
    '#.#.##.#.##.#.#',
    '#.#.........#.#',
    '#.###.#.#.###.#',
    '#......P......#',
    '###############'
  ];
  var COLS = MAP[0].length, ROWS = MAP.length;
  var W = COLS * CELL, H = ROWS * CELL + HUD;
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

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

  function isWall(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return MAP[r].charAt(c) === '#';
  }
  function findChar(ch) {
    for (var r = 0; r < ROWS; r++) {
      var c = MAP[r].indexOf(ch);
      if (c >= 0) return [c, r];
    }
    return [7, 6];
  }

  function mount(root) {
    var canvas = makeCanvas(root, '404 maze mini game — eat the dots, dodge the ghosts');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var pStart = findChar('P');
    var gStart = [7, 6];
    var player, ghosts, dots, dotsLeft, score, lives, level, invulnT, mouthT;

    function buildDots() {
      dots = {};
      dotsLeft = 0;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (MAP[r].charAt(c) === '.') { dots[c + ',' + r] = true; dotsLeft++; }
        }
      }
    }
    function newActor(c, r, speed) {
      return { c: c, r: r, dir: null, prog: 0, speed: speed };
    }
    function resetPositions() {
      player = newActor(pStart[0], pStart[1], 4.2);
      player.want = null;
      ghosts = [
        newActor(gStart[0] - 1, gStart[1], 3.1 + level * 0.25),
        newActor(gStart[0] + 1, gStart[1], 3.1 + level * 0.25)
      ];
      invulnT = 1.2;
    }
    function reset() {
      score = 0; lives = 3; level = 0; mouthT = 0;
      buildDots();
      resetPositions();
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    function open(c, r, dir) {
      return !isWall(c + DIRS[dir][0], r + DIRS[dir][1]);
    }
    function px(a) { return (a.c + 0.5) * CELL + (a.dir ? DIRS[a.dir][0] * a.prog * CELL : 0); }
    function py(a) { return HUD + (a.r + 0.5) * CELL + (a.dir ? DIRS[a.dir][1] * a.prog * CELL : 0); }

    function stepActor(a, dt, decide) {
      var budget = a.speed * dt;
      while (budget > 0) {
        if (!a.dir) {
          decide(a);
          if (!a.dir) return;
        }
        var left = 1 - a.prog;
        var use = Math.min(left, budget);
        a.prog += use;
        budget -= use;
        if (a.prog >= 1 - 1e-9) {
          a.c += DIRS[a.dir][0];
          a.r += DIRS[a.dir][1];
          a.prog = 0;
          var prev = a.dir;
          a.dir = null;
          decide(a, prev);
          if (!a.dir) return;
        }
      }
    }

    function decidePlayer(a, prev) {
      if (a.want && open(a.c, a.r, a.want)) a.dir = a.want;
      else if (prev && open(a.c, a.r, prev)) a.dir = prev;
      // eat the dot in this cell
      var key = a.c + ',' + a.r;
      if (dots[key]) {
        delete dots[key];
        dotsLeft--;
        score += 10;
      }
    }
    function openDirs(a, prev) {
      var options = [];
      for (var d in DIRS) {
        if (prev && d === OPP[prev]) continue;
        if (open(a.c, a.r, d)) options.push(d);
      }
      return options;
    }

    // greedy: the option that closes the distance to the player
    function chaseDir(a, options) {
      var pc = player.c + (player.dir ? DIRS[player.dir][0] * player.prog : 0);
      var pr = player.r + (player.dir ? DIRS[player.dir][1] * player.prog : 0);
      var best = options[0], bestD = 1e9;
      for (var i = 0; i < options.length; i++) {
        var dx = a.c + DIRS[options[i]][0] - pc;
        var dy = a.r + DIRS[options[i]][1] - pr;
        var dist = dx * dx + dy * dy;
        if (dist < bestD) { bestD = dist; best = options[i]; }
      }
      return best;
    }

    function decideGhost(a, prev) {
      var options = openDirs(a, prev);
      if (!options.length) { a.dir = prev ? OPP[prev] : null; return; }
      a.dir = Math.random() < 0.62
        ? chaseDir(a, options)
        : options[Math.floor(Math.random() * options.length)];
    }

    // allow instant reversal for responsiveness
    function applyReversal() {
      if (player.want && player.dir && player.want === OPP[player.dir]) {
        player.c += DIRS[player.dir][0];
        player.r += DIRS[player.dir][1];
        player.dir = player.want;
        player.prog = 1 - player.prog;
      }
    }

    function hitGhost() {
      if (invulnT > 0) return false;
      for (var i = 0; i < ghosts.length; i++) {
        var dx = px(player) - px(ghosts[i]), dy = py(player) - py(ghosts[i]);
        if (dx * dx + dy * dy < (CELL * 0.58) * (CELL * 0.58)) return true;
      }
      return false;
    }

    function update(dt) {
      mouthT += dt;
      if (invulnT > 0) invulnT -= dt;

      applyReversal();
      stepActor(player, dt, decidePlayer);
      for (var i = 0; i < ghosts.length; i++) stepActor(ghosts[i], dt, decideGhost);

      if (dotsLeft <= 0) {
        level++;
        score += 100;
        buildDots();
        resetPositions();
        return;
      }

      if (hitGhost()) {
        lives--;
        if (lives <= 0) return gameOver();
        resetPositions();
      }
    }

    function drawGhost(x, y, r, alpha) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.15, r, Math.PI, 0);
      ctx.lineTo(x + r, y + r * 0.75);
      for (var i = 0; i < 3; i++) {
        ctx.lineTo(x + r - (i * 2 + 1) * (r / 3), y + r * (i % 2 ? 0.75 : 0.5));
      }
      ctx.lineTo(x - r, y + r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = alpha;
      var eb = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.save();
      ctx.fillStyle = eb;
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x + r * 0.35, y - r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      drawBoard();
      drawActors();
      drawHud();

      if (st === 'idle') overlay('404 MAZE', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function drawBoard() {
      // walls
      ctx.fillStyle = th.fg;
      ctx.globalAlpha = 0.22;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (MAP[r].charAt(c) === '#') {
            ctx.fillRect(c * CELL + 1.5, HUD + r * CELL + 1.5, CELL - 3, CELL - 3);
          }
        }
      }
      ctx.globalAlpha = 1;

      // dots
      ctx.fillStyle = th.fg;
      for (var key in dots) {
        var parts = key.split(',');
        ctx.beginPath();
        ctx.arc((+parts[0] + 0.5) * CELL, HUD + (+parts[1] + 0.5) * CELL, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawActors() {
      if (st === 'idle') return;

      // player: the muncher (blinks while invulnerable)
      if (invulnT <= 0 || Math.floor(invulnT * 8) % 2 === 0) {
        var mouth = 0.28 + 0.24 * Math.sin(mouthT * 12);
        var ang = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 }[player.dir || 'right'] || 0;
        ctx.fillStyle = th.accent;
        ctx.beginPath();
        ctx.moveTo(px(player), py(player));
        ctx.arc(px(player), py(player), CELL * 0.42, ang + mouth, ang - mouth + Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = th.fg;
      for (var i = 0; i < ghosts.length; i++) {
        drawGhost(px(ghosts[i]), py(ghosts[i]), CELL * 0.4, i === 0 ? 0.95 : 0.6);
      }
    }

    function drawHud() {
      ctx.fillStyle = th.fg;
      ctx.font = font(13);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(score), 10, 18);
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + hi, 80, 18);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'right';
      var hearts = '';
      for (var i = 0; i < lives; i++) hearts += '♥ ';
      ctx.fillText(hearts.trim(), W - 10, 18);
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.globalAlpha = 0.78;
      ctx.fillRect(0, H / 2 - 64, W, 128);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(20);
      ctx.fillText(title, W / 2, H / 2 - 24);
      if (sub) { ctx.font = font(15); ctx.fillText(sub, W / 2, H / 2); }
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

    var KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right'
    };
    var swipeX = 0, swipeY = 0, swiping = false;
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      swiping = true; swipeX = e.clientX; swipeY = e.clientY;
    }
    function onPointerMove(e) {
      if (!swiping || st !== 'run') return;
      var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      player.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      swipeX = e.clientX; swipeY = e.clientY;
    }
    function onPointerUp() { swiping = false; }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (KEYS[e.code] && st === 'run') {
        e.preventDefault();
        player.want = KEYS[e.code];
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'idle' || (st === 'over' && performance.now() - overAt > 400)) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
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
