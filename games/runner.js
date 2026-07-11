/*! 404 Games — runner | MIT | https://github.com/kenimo49/404-games
 * Homage to Chrome's offline dinosaur runner: jump over the 404 blocks.
 *
 * Usage:
 *   <div data-404-game="runner"></div>
 *   <script src="runner.js"></script>
 * or programmatically: Games404.runner.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg      main color   (default: container text color)
 *   --g404-bg      background   (default: transparent)
 *   --g404-accent  highlights   (default: same as fg)
 */
(function () {
  'use strict';

  var NAME = 'runner';
  var W = 600, H = 150;
  var GROUND = 128;

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
    var canvas = makeCanvas(root, '404 runner mini game — jump over the obstacles');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle'; // idle | run | over
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0;

    var py, vy, dist, speed, score, obs, clouds, gap;

    function reset() {
      py = GROUND; vy = 0; dist = 0; speed = 250; score = 0;
      obs = []; gap = 1.1;
      clouds = [{ x: 120, y: 30 }, { x: 320, y: 55 }, { x: 520, y: 22 }];
    }
    reset();

    function start() {
      reset();
      st = 'run';
      canvas.focus();
    }
    function jump() {
      if (py >= GROUND - 0.5) vy = -570;
    }
    function gameOver() {
      st = 'over';
      overAt = performance.now();
      if (score > hi) { hi = score; saveHi(hi); }
    }

    function spawn() {
      var pick = Math.random();
      var ch = pick < 0.4 ? '4' : pick < 0.7 ? '0' : pick < 0.9 ? '40' : '404';
      var size = 26 + Math.random() * 12;
      obs.push({ x: W + 30, ch: ch, size: size, w: ch.length * size * 0.62, h: size * 0.72 });
      gap = Math.max(0.5, (0.6 + Math.random() * 0.85) * (330 / speed));
    }

    function update(dt) {
      speed = Math.min(620, speed + 7 * dt);
      dist += speed * dt;
      score = Math.floor(dist / 10);

      vy += 1950 * dt;
      py = Math.min(GROUND, py + vy * dt);
      if (py >= GROUND) vy = 0;

      gap -= dt;
      if (gap <= 0) spawn();

      for (var i = obs.length - 1; i >= 0; i--) {
        obs[i].x -= speed * dt;
        if (obs[i].x + obs[i].w < -10) obs.splice(i, 1);
      }
      for (i = 0; i < clouds.length; i++) {
        clouds[i].x -= speed * 0.12 * dt;
        if (clouds[i].x < -40) { clouds[i].x = W + 40; clouds[i].y = 15 + Math.random() * 55; }
      }

      // collision (player box: x 48..66, y py-24..py), 3px forgiveness
      var pl = 48 + 3, pr = 66 - 3, pt = py - 24 + 3, pb = py - 1;
      for (i = 0; i < obs.length; i++) {
        var o = obs[i];
        if (pr > o.x + 2 && pl < o.x + o.w - 2 && pb > GROUND - o.h + 2 && pt < GROUND) {
          gameOver();
          break;
        }
      }
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      drawBackdrop();
      drawObstacles();
      drawPlayer();
      drawScore();

      if (st === 'idle') overlay('404 RUNNER', null);
      else if (st === 'over') overlay('GAME OVER', String(score));
    }

    function drawBackdrop() {
      // clouds
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = th.fg;
      for (var i = 0; i < clouds.length; i++) {
        ctx.beginPath();
        ctx.ellipse(clouds[i].x, clouds[i].y, 18, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(clouds[i].x + 14, clouds[i].y + 3, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ground
      ctx.strokeStyle = th.fg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 1);
      ctx.lineTo(W, GROUND + 1);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      for (i = 0; i < 8; i++) {
        var tx = ((i * 83 - dist * 0.9) % (W + 40) + W + 40) % (W + 40) - 20;
        ctx.fillRect(tx, GROUND + 6, 10, 1.5);
      }
      ctx.globalAlpha = 1;
    }

    function drawObstacles() {
      // the 404 blocks
      ctx.fillStyle = th.accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      for (var i = 0; i < obs.length; i++) {
        ctx.font = font(obs[i].size);
        ctx.fillText(obs[i].ch, obs[i].x, GROUND);
      }
    }

    function drawPlayer() {
      // a little blob with an eye
      ctx.fillStyle = th.fg;
      var run = st === 'run' && py >= GROUND - 0.5;
      var phase = Math.floor(dist / 14) % 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(48, py - 24, 20, 22, 5);
      else ctx.rect(48, py - 24, 20, 22);
      ctx.fill();
      if (run) {
        ctx.fillRect(50 + (phase ? 0 : 8), py - 3, 5, 3);
        ctx.fillRect(60 - (phase ? 0 : 8), py - 3, 5, 3);
      } else {
        ctx.fillRect(50, py - 3, 5, 3);
        ctx.fillRect(60, py - 3, 5, 3);
      }
      ctx.fillStyle = th.bg !== 'transparent' ? th.bg : '#fff';
      ctx.fillRect(60, py - 19, 4, 4);
    }

    function drawScore() {
      ctx.fillStyle = th.fg;
      ctx.font = font(13);
      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.6;
      ctx.fillText('HI ' + String(hi).padStart(5, '0'), W - 90, 20);
      ctx.globalAlpha = 1;
      ctx.fillText(String(score).padStart(5, '0'), W - 12, 20);
    }

    function overlay(title, sub) {
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
      ctx.font = font(18);
      ctx.fillText(title, W / 2, 52);
      if (sub) { ctx.font = font(14); ctx.fillText(sub, W / 2, 74); }
      drawPlay(ctx, W / 2, 98, 12);
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
      if (st === 'idle') start();
      else if (st === 'run') jump();
      else if (performance.now() - overAt > 400) start();
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        if (st === 'run') jump();
        else if (st === 'idle' || performance.now() - overAt > 400) start();
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
