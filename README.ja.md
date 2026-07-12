# 404 Games（404ゲームズ）

404ページに置ける単一ファイルのcanvasミニゲーム10本。有名エラーページとアーケードクラシックへのオマージュ集です。Vanilla JS・依存ゼロ・ビルド不要、1ゲーム7〜14KB。404ページに`<script>`タグを1つ置くだけで、離脱するはずだった訪問者が遊んでいきます。

[English README](README.md) · ライブデモ: [kenimoto.dev](https://kenimoto.dev) の存在しないURL（例: [kenimoto.dev/notexist](https://kenimoto.dev/notexist)）

## 収録ゲーム

| ゲーム | オマージュ元 | ファイル |
|--------|-------------|---------|
| 🦖 RUNNER | Chromeのオフライン恐竜ランナー。404ブロックを飛び越える | `games/runner.js` |
| 👾 INVADERS | [KualoのSpace Invaders 404](https://www.kualo.com/404)。編隊が「404」の形 | `games/invaders.js` |
| 🧱 BREAKOUT | Atari Breakout。ブロックが「404」の形 | `games/breakout.js` |
| 🐍 SNAKE | Nokia / Google Snake。ゼロを食べて伸びる | `games/snake.js` |
| 🏓 PONG | Pong（Atari、1972）。7点先取でマシンに勝つ | `games/pong.js` |
| 🐤 FLAPPY | Flappy Bird。4-0-4の土管の隙間を飛ぶ | `games/flappy.js` |
| 👻 MAZE | クラシックなドットイーター。ドットを食べ尽くしゴーストをかわす | `games/maze.js` |
| ☄️ ASTEROIDS | Asteroids（Atari、1979）。漂う4と0を撃ち砕く | `games/asteroids.js` |
| 🔨 WHACK | モグラ叩きHTTP版。404を叩き、200 OKは見逃す | `games/whack.js` |
| 🔢 2048 | [2048（Gabriele Cirulli作）](https://github.com/gabrielecirulli/2048)。スライドしてマージ | `games/2048.js` |

実装はすべてオリジナルのオマージュです。図形とコード描画のピクセルアートのみで、アセットや商標のコピーは含みません。

## クイックスタート

### 方法A: アーケード（10本のメニュー、推奨）

`games/` ディレクトリをサイトにコピーして:

```html
<div data-404-arcade></div>
<script src="/404-games/arcade.js"></script>
```

`arcade.js` がゲームメニューを描画し、選ばれたゲームを自分の配信元ディレクトリから遅延ロードします（`data-base="/some/path/"` で上書き可能）。URLに `?g404=runner` を付けると直接そのゲームが開きます（`?g404=menu` は `data-default` 指定より優先してメニューを表示します）。ページ側に独自の見出しがある場合は、コンテナに `data-no-title` を付けると内蔵の「404 ARCADE」見出しを非表示にできます。`data-default="runner"` を付けると最初からそのゲームを開いた状態になります（メニューには戻るボタンで移動）。

サイト固有の自作ゲームをメニューに足すこともできます。他のゲームと同じマウント規約の `<id>.js` を同じディレクトリに置き、`arcade.js` の読み込み前にメタデータを登録するとメニューの先頭に並びます（idは小文字英数字にするとディープリンク可能なままです）:

```html
<script>
  window.Games404 = window.Games404 || {};
  window.Games404.extraGames = [{ id: 'ship', icon: '⛵', label: 'SHIP' }];
</script>
<script src="/404-games/arcade.js"></script>
```

### 方法B: 1ゲームだけ

ファイルを1つコピーするだけ。各ゲームは完全に自己完結しています:

```html
<div data-404-game="runner"></div>
<script src="/404-games/runner.js"></script>
```

### 方法C: プログラムから

```js
const instance = Games404.runner.mount(document.querySelector('#stage'));
// 後で:
instance.destroy();
```

## テーマ設定

各ゲームはコンテナのCSSカスタムプロパティ3つを1秒ごとに読み直すので、サイトのライト/ダーク切替にライブで追従します:

```html
<div data-404-game="snake"
     style="--g404-fg: #1f2937; --g404-bg: transparent; --g404-accent: #1e3a5f;">
</div>
```

| 変数 | 用途 | デフォルト |
|------|------|-----------|
| `--g404-fg` | テキスト・プレイヤー・HUD・壁 | コンテナの `color` |
| `--g404-bg` | canvasの背景 | `transparent` |
| `--g404-accent` | 障害物・ブロック・インベーダー・タイル | `--g404-fg` と同じ |

## 操作方法

どのゲームもクリック / タップ / `Space`（フォーカス時）で開始し、ゲームオーバー後も同じ操作で再開します。キーボード入力はcanvasにフォーカスがあるときだけ拾うので、ページのスクロールを乗っ取りません。

| ゲーム | キーボード | タッチ / マウス |
|--------|-----------|----------------|
| RUNNER | `Space` / `↑` ジャンプ | タップでジャンプ |
| INVADERS | `←` `→` 移動、`Space` 発射 | ドラッグで移動、タップで発射 |
| BREAKOUT | `←` `→` 移動、`Space` 発射 | ポインタで移動、タップで発射 |
| SNAKE | 矢印 / WASD | スワイプ |
| PONG | `↑` `↓` | ポインタ移動 |
| FLAPPY | `Space` / `↑` 羽ばたき | タップ |
| MAZE | 矢印 / WASD | スワイプ |
| ASTEROIDS | `←` `→` 回転、`↑` 推進、`Space` 発射 | ドラッグで操縦、タップで発射 |
| WHACK | `1`〜`9` で9つの穴を叩く | 404をクリック / タップ |
| 2048 | 矢印 / WASD | スワイプ |

## 挙動の補足

- **ハイスコア**はゲームごとに `localStorage`（`g404:hi:<game>`）へ保存。ストレージが使えない環境では黙って無効になります。
- **レスポンシブ**: canvasはコンテナ幅（ゲームのネイティブ幅まで）に追従し、HiDPI画面でも滲みません。
- **言語非依存**: 数字・ハート・最小限のアーケード英語（`GAME OVER`、`HI`）のみ。多言語404ページでそのまま使えます。
- **404ページの良き市民**: 外部リクエストなし・Cookieなし。開始されるまでゲームは約4fpsの軽い待機描画だけです。404ステータスと `noindex` はそのままどうぞ。
- **ブラウザサポート**: evergreenブラウザとSafari/iOS 13+（Pointer Eventsが下限。それ以外の機能はグレースフルに退化します）。

## 開発

ビルドはありません。`games/` 配下のファイルを編集して `demo/index.html` をブラウザで開くだけ（`file://` でも動きます）。demoページにはテーマ確認用のライト/ダークトグルがあります。

### テスト

`test/smoke.mjs` がheadless Chromeで全ゲーム+アーケードをマウントし、起動・操作・ページエラー0件を検証します。必要なのはpuppeteerだけです（同梱していません）:

```bash
npm install --no-save --no-package-lock puppeteer
node test/smoke.mjs
```

`scripts/check-health.sh` はメンテナ用の任意のlint/複雑度ゲートです。内部のcode-healthハーネスがローカルにある場合だけ動き、無ければそのままskipするので、コントリビュータは無視して構いません。

## ライセンス

[MIT](LICENSE) © ken imoto
