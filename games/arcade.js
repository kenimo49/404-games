/*! 404 Games — arcade | MIT | https://github.com/kenimo49/404-games
 * The picker. Renders a menu of all ten games and lazy-loads the chosen one
 * from the same directory this script was served from.
 *
 * Usage:
 *   <div data-404-arcade></div>
 *   <script src="arcade.js"></script>
 *
 * Options:
 *   <script src="arcade.js" data-base="/404-games/"></script>  … override game file location
 *   ?g404=<id> in the page URL … open a game directly (e.g. ?g404=runner)
 *
 * Theming: same CSS variables as the games (--g404-fg / --g404-bg / --g404-accent).
 */
(function () {
  'use strict';

  var GAMES = [
    { id: 'runner', icon: '🦖', label: 'RUNNER' },
    { id: 'invaders', icon: '👾', label: 'INVADERS' },
    { id: 'breakout', icon: '🧱', label: 'BREAKOUT' },
    { id: 'snake', icon: '🐍', label: 'SNAKE' },
    { id: 'pong', icon: '🏓', label: 'PONG' },
    { id: 'flappy', icon: '🐤', label: 'FLAPPY' },
    { id: 'maze', icon: '👻', label: 'MAZE' },
    { id: 'asteroids', icon: '☄️', label: 'ASTEROIDS' },
    { id: 'whack', icon: '🔨', label: 'WHACK' },
    { id: '2048', icon: '🔢', label: '2048' }
  ];

  var script = document.currentScript;
  function defaultBase() {
    if (script && script.getAttribute('data-base')) return script.getAttribute('data-base');
    if (script && script.src) return script.src.replace(/[^/]*$/, '');
    return '';
  }

  function loadGame(id, base, cb) {
    if (window.Games404 && window.Games404[id]) return cb(null);
    var s = document.createElement('script');
    s.src = base + id + '.js';
    s.onload = function () { cb(window.Games404 && window.Games404[id] ? null : new Error('bad game file')); };
    s.onerror = function () { cb(new Error('load failed')); };
    document.head.appendChild(s);
  }

  function mount(root, opts) {
    opts = opts || {};
    var base = opts.base || defaultBase();
    var instance = null;

    var wrap = document.createElement('div');
    wrap.style.maxWidth = '640px';
    wrap.style.margin = '0 auto';
    wrap.style.textAlign = 'center';

    var bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.alignItems = 'center';
    bar.style.justifyContent = 'space-between';
    bar.style.margin = '0 0 0.75rem';

    var title = document.createElement('span');
    title.textContent = '404 ARCADE';
    title.style.fontFamily = 'ui-monospace, Menlo, Consolas, monospace';
    title.style.fontWeight = '700';
    title.style.fontSize = '0.85rem';
    title.style.letterSpacing = '0.15em';
    title.style.opacity = '0.7';

    var back = document.createElement('button');
    back.type = 'button';
    back.textContent = '← MENU';
    back.setAttribute('aria-label', 'back to game menu');
    back.style.font = 'inherit';
    back.style.fontFamily = 'ui-monospace, Menlo, Consolas, monospace';
    back.style.fontSize = '0.8rem';
    back.style.fontWeight = '700';
    back.style.color = 'inherit';
    back.style.background = 'none';
    back.style.border = '1px solid currentColor';
    back.style.borderRadius = '8px';
    back.style.padding = '0.3rem 0.7rem';
    back.style.cursor = 'pointer';
    back.style.opacity = '0.7';
    back.style.display = 'none';

    bar.appendChild(title);
    bar.appendChild(back);

    var menu = document.createElement('div');
    menu.style.display = 'grid';
    menu.style.gridTemplateColumns = 'repeat(auto-fill, minmax(104px, 1fr))';
    menu.style.gap = '10px';

    var stage = document.createElement('div');
    stage.style.display = 'none';

    var note = document.createElement('div');
    note.style.display = 'none';
    note.style.fontFamily = 'ui-monospace, Menlo, Consolas, monospace';
    note.style.fontSize = '0.85rem';
    note.style.opacity = '0.7';
    note.style.padding = '2rem 0';

    function showMenu() {
      if (instance && instance.destroy) instance.destroy();
      instance = null;
      stage.innerHTML = '';
      stage.style.display = 'none';
      note.style.display = 'none';
      back.style.display = 'none';
      menu.style.display = 'grid';
    }
    function showGame(id) {
      menu.style.display = 'none';
      note.textContent = '…';
      note.style.display = 'block';
      back.style.display = 'inline-block';
      loadGame(id, base, function (err) {
        note.style.display = 'none';
        if (err) {
          note.textContent = 'FAILED TO LOAD ' + id.toUpperCase();
          note.style.display = 'block';
          return;
        }
        stage.style.display = 'block';
        instance = window.Games404[id].mount(stage);
        try { localStorage.setItem('g404:last', id); } catch (e) {}
      });
    }

    GAMES.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.style.font = 'inherit';
      b.style.color = 'inherit';
      b.style.background = 'none';
      b.style.border = '1px solid currentColor';
      b.style.borderRadius = '10px';
      b.style.padding = '0.7rem 0.4rem 0.55rem';
      b.style.cursor = 'pointer';
      b.style.display = 'flex';
      b.style.flexDirection = 'column';
      b.style.alignItems = 'center';
      b.style.gap = '6px';
      b.style.opacity = '0.85';
      b.onmouseenter = function () { b.style.opacity = '1'; };
      b.onmouseleave = function () { b.style.opacity = '0.85'; };

      var ic = document.createElement('span');
      ic.textContent = g.icon;
      ic.style.fontSize = '1.5rem';
      ic.style.lineHeight = '1';
      var lb = document.createElement('span');
      lb.textContent = g.label;
      lb.style.fontFamily = 'ui-monospace, Menlo, Consolas, monospace';
      lb.style.fontSize = '0.68rem';
      lb.style.fontWeight = '700';
      lb.style.letterSpacing = '0.08em';

      b.appendChild(ic);
      b.appendChild(lb);
      b.addEventListener('click', function () { showGame(g.id); });
      menu.appendChild(b);
    });

    back.addEventListener('click', showMenu);

    wrap.appendChild(bar);
    wrap.appendChild(menu);
    wrap.appendChild(note);
    wrap.appendChild(stage);
    root.appendChild(wrap);

    // deep link: ?g404=<id>
    try {
      var m = /[?&]g404=([a-z0-9]+)/.exec(window.location.search);
      if (m) {
        for (var i = 0; i < GAMES.length; i++) {
          if (GAMES[i].id === m[1]) { showGame(m[1]); break; }
        }
      }
    } catch (e) {}

    return {
      destroy: function () {
        if (instance && instance.destroy) instance.destroy();
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }
    };
  }

  window.Games404 = window.Games404 || {};
  window.Games404.arcade = { name: 'arcade', mount: mount, games: GAMES };
  function auto() {
    var els = document.querySelectorAll('[data-404-arcade]');
    for (var i = 0; i < els.length; i++) {
      if (!els[i].g404Mounted) {
        els[i].g404Mounted = true;
        mount(els[i]);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
