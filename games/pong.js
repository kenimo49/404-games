/*! 404 Games — pong | MIT | https://github.com/kenimo49/404-games
 * Homage to Pong, the arcade original. First to 7 beats the machine.
 *
 * Usage:
 *   <div data-404-game="pong"></div>
 *   <script src="pong.js"></script>
 * or programmatically: Games404.pong.mount(element)
 *
 * Theming via CSS variables on the container (all optional):
 *   --g404-fg / --g404-bg / --g404-accent
 */
(function () {
  'use strict';

  var NAME = 'pong';
  var W = 480, H = 320;
  var WIN = 7;
  var PW = 8, PH = 56;

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

  function mount(root) {
    var canvas = makeCanvas(root, '404 pong mini game — first to seven');
    var ctx = canvas.getContext('2d');
    var th = readTheme(root);
    var hi = loadHi();
    var st = 'idle';
    var raf = 0, last = 0, overAt = 0, destroyed = false, themeT = 0, idleT = 1, drawnSt = '';

    var pY, aiY, bx, by, bvx, bvy, myScore, aiScore, serveT, keyUp = false, keyDown = false, won = false;

    function serve(toLeft) {
      bx = W / 2; by = H / 2;
      var ang = (Math.random() * 0.5 - 0.25) * Math.PI;
      var sp = 240;
      bvx = Math.cos(ang) * sp * (toLeft ? -1 : 1);
      bvy = Math.sin(ang) * sp;
      serveT = 0.7;
    }
    function reset() {
      pY = H / 2; aiY = H / 2; myScore = 0; aiScore = 0; won = false;
      serve(Math.random() < 0.5);
    }
    reset();

    function start() { reset(); st = 'run'; canvas.focus(); }
    function gameOver() {
      st = 'over'; overAt = performance.now();
      won = myScore >= WIN;
      announce(root, (won ? 'you win. ' : 'game over. ') + myScore + ' to ' + aiScore);
      if (myScore > hi) { hi = myScore; saveHi(hi); }
    }

    function movePaddles(dt) {
      if (keyUp) pY -= 340 * dt;
      if (keyDown) pY += 340 * dt;
      pY = Math.max(PH / 2, Math.min(H - PH / 2, pY));

      // AI follows the ball, capped speed, slight dead zone
      var aiMax = 205 + (myScore + aiScore) * 6;
      var dy = by - aiY;
      if (Math.abs(dy) > 6) aiY += Math.max(-aiMax * dt, Math.min(aiMax * dt, dy));
      aiY = Math.max(PH / 2, Math.min(H - PH / 2, aiY));
    }

    function moveBall(dt) {
      // sub-step so a fast ball cannot tunnel through the paddles at low frame rates
      var sp = Math.sqrt(bvx * bvx + bvy * bvy);
      var steps = Math.max(1, Math.ceil(sp * dt / 8));
      for (var i = 0; i < steps; i++) moveBallStep(dt / steps);
    }

    function moveBallStep(dt) {
      bx += bvx * dt;
      by += bvy * dt;
      if (by < 5) { by = 5; bvy = Math.abs(bvy); }
      if (by > H - 5) { by = H - 5; bvy = -Math.abs(bvy); }

      // player paddle at x=18
      if (bvx < 0 && bx < 18 + PW + 5 && bx > 14 && Math.abs(by - pY) < PH / 2 + 5) {
        bvx = Math.abs(bvx) * 1.045;
        bvy += (by - pY) * 4.2;
        bvx = Math.min(bvx, 560);
      }
      // AI paddle at x=W-18-PW
      if (bvx > 0 && bx > W - 18 - PW - 5 && bx < W - 14 && Math.abs(by - aiY) < PH / 2 + 5) {
        bvx = -Math.abs(bvx) * 1.045;
        bvy += (by - aiY) * 4.2;
        bvx = Math.max(bvx, -560);
      }
      bvy = Math.max(-420, Math.min(420, bvy));
    }

    function settlePoint() {
      if (bx < -10) {
        aiScore++;
        if (aiScore >= WIN) return gameOver();
        serve(true);
      } else if (bx > W + 10) {
        myScore++;
        if (myScore >= WIN) return gameOver();
        serve(false);
      }
    }

    function update(dt) {
      movePaddles(dt);
      if (serveT > 0) { serveT -= dt; return; }
      moveBall(dt);
      settlePoint();
    }

    function draw() {
      var s = canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (th.bg !== 'transparent') { ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H); }

      // center dashed line
      ctx.strokeStyle = th.fg;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 8);
      ctx.lineTo(W / 2, H - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // scores
      ctx.fillStyle = th.fg;
      ctx.font = font(30);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(myScore), W / 2 - 50, 42);
      ctx.fillText(String(aiScore), W / 2 + 50, 42);

      // paddles + ball
      ctx.fillRect(18, pY - PH / 2, PW, PH);
      ctx.fillRect(W - 18 - PW, aiY - PH / 2, PW, PH);
      if (st !== 'idle') {
        ctx.fillStyle = th.accent;
        ctx.fillRect(bx - 5, by - 5, 10, 10);
      }

      if (st === 'idle') overlay('404 PONG', null);
      else if (st === 'over') overlay(won ? 'YOU WIN' : 'GAME OVER', myScore + ' : ' + aiScore);
    }

    function overlay(title, sub) {
      ctx.fillStyle = overlayBg(ctx, th);
      ctx.globalAlpha = 0.72;
      ctx.fillRect(0, H / 2 - 66, W, 132);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.fg;
      ctx.textAlign = 'center';
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

    function pointerY(e) {
      var r = canvas.getBoundingClientRect();
      return (e.clientY - r.top) / r.height * H;
    }
    function onPointerDown(e) {
      e.preventDefault();
      canvas.focus();
      if (st === 'idle') return start();
      if (st === 'over') { if (performance.now() - overAt > 400) start(); return; }
      if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
      pY = Math.max(PH / 2, Math.min(H - PH / 2, pointerY(e)));
    }
    function onPointerMove(e) {
      if (st !== 'run' || (e.pointerType === 'mouse' && e.buttons === 0 && e.movementX === 0 && e.movementY === 0)) return;
      pY = Math.max(PH / 2, Math.min(H - PH / 2, pointerY(e)));
    }
    function onKey(e) {
      if (document.activeElement !== canvas) return;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { keyUp = e.type === 'keydown'; e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { keyDown = e.type === 'keydown'; e.preventDefault(); }
      else if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        if (st === 'idle' || (st === 'over' && performance.now() - overAt > 400)) start();
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKey);
    canvas.addEventListener('blur', function () { keyUp = keyDown = false; }); // held keys must not survive focus loss
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
