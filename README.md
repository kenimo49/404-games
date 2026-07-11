# 404 Games

Ten single-file canvas mini games for your 404 page, inspired by famous error
pages and arcade classics. Vanilla JS, zero dependencies, no build step,
7–14 KB per game. Drop one `<script>` tag into your 404 page and let visitors
play instead of bouncing.

[日本語版 README](README.ja.md) · Live demo: visit any broken URL on
[kenimoto.dev](https://kenimoto.dev/404), e.g. [kenimoto.dev/notexist](https://kenimoto.dev/notexist)

## The games

| Game | Inspired by | File |
|------|-------------|------|
| 🦖 RUNNER | Chrome's offline dinosaur runner. Jump over the 404 blocks | `games/runner.js` |
| 👾 INVADERS | [Kualo's Space Invaders 404](https://www.kualo.com/404). The formation spells "404" | `games/invaders.js` |
| 🧱 BREAKOUT | Atari Breakout. The bricks spell "404" | `games/breakout.js` |
| 🐍 SNAKE | Nokia / Google Snake. Eat the zeros | `games/snake.js` |
| 🏓 PONG | Pong (Atari, 1972). First to 7 beats the machine | `games/pong.js` |
| 🐤 FLAPPY | Flappy Bird. Flap between the 4-0-4 pipes | `games/flappy.js` |
| 👻 MAZE | The classic arcade dot-muncher. Clear the maze, dodge two ghosts | `games/maze.js` |
| ☄️ ASTEROIDS | Asteroids (Atari, 1979). Blast the drifting 4s and 0s | `games/asteroids.js` |
| 🔨 WHACK | Whack-a-mole, HTTP edition. Smash the 404s, spare the 200 OK | `games/whack.js` |
| 🔢 2048 | [2048 by Gabriele Cirulli](https://github.com/gabrielecirulli/2048). Slide and merge | `games/2048.js` |

All implementations are original homages: generic shapes, pixel-art drawn in
code, no copied assets or trademarks.

## Quick start

### Option A: the arcade (menu of all ten, recommended)

Copy the `games/` directory to your site, then:

```html
<div data-404-arcade></div>
<script src="/404-games/arcade.js"></script>
```

`arcade.js` renders a game menu and lazy-loads the chosen game from the same
directory it was served from (override with `data-base="/some/path/"`).
Deep-link a game with `?g404=runner` in the page URL (`?g404=menu` forces
the menu even when `data-default` is set). Add `data-no-title` to
the container to hide the built-in "404 ARCADE" heading when your page
provides its own, and `data-default="runner"` to open a game right away (the
menu stays one back-button away).

You can also add your own site-specific game to the menu: serve a `<id>.js`
file next to the others (same mount conventions) and register its metadata
before `arcade.js` loads. It appears first in the menu:

```html
<script>
  window.Games404 = window.Games404 || {};
  window.Games404.extraGames = [{ id: 'ship', icon: '⛵', label: 'SHIP' }];
</script>
<script src="/404-games/arcade.js"></script>
```

### Option B: a single game

Copy one file. Each game is fully standalone:

```html
<div data-404-game="runner"></div>
<script src="/404-games/runner.js"></script>
```

### Option C: programmatic

```js
const instance = Games404.runner.mount(document.querySelector('#stage'));
// later:
instance.destroy();
```

## Theming

Games read three CSS custom properties from their container once a second, so
they follow your light/dark theme toggle live:

```html
<div data-404-game="snake"
     style="--g404-fg: #1f2937; --g404-bg: transparent; --g404-accent: #1e3a5f;">
</div>
```

| Variable | Used for | Default |
|----------|----------|---------|
| `--g404-fg` | text, player, HUD, walls | container's `color` |
| `--g404-bg` | canvas background | `transparent` |
| `--g404-accent` | obstacles, bricks, invaders, tiles | same as `--g404-fg` |

## Controls

Every game starts with a click / tap / `Space` (when focused) and restarts the
same way after game over. Keyboard input is only captured while the canvas has
focus, so the game never hijacks the page.

| Game | Keyboard | Touch / mouse |
|------|----------|---------------|
| RUNNER | `Space` / `↑` jump | tap to jump |
| INVADERS | `←` `→` move, `Space` fire | drag to move, tap to fire |
| BREAKOUT | `←` `→` move, `Space` launch | move pointer, tap to launch |
| SNAKE | arrows / WASD | swipe |
| PONG | `↑` `↓` | move pointer |
| FLAPPY | `Space` / `↑` flap | tap to flap |
| MAZE | arrows / WASD | swipe |
| ASTEROIDS | `←` `→` rotate, `↑` thrust, `Space` fire | drag to steer, tap to fire |
| WHACK | — | click / tap the 404s |
| 2048 | arrows / WASD | swipe |

## Behavior notes

- **High scores** persist per game in `localStorage` (`g404:hi:<game>`), and
  fail silently where storage is blocked.
- **Responsive**: the canvas fills its container up to the game's native width
  and stays sharp on HiDPI screens.
- **Language-neutral**: numbers, hearts and a handful of arcade-English words
  (`GAME OVER`, `HI`), so it works on multilingual 404 pages as-is.
- **Well-behaved 404 citizen**: no external requests, no cookies, nothing runs
  until the visitor starts a game. Keep your 404 HTTP status and `noindex`.

## Development

There is no build. Edit a file under `games/`, open `demo/index.html` in a
browser (a `file://` URL works), and play. The demo page includes a light/dark
toggle to check theming.

## License

[MIT](LICENSE) © ken imoto
