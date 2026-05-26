# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

A **no-build, CDN-based** Paper.js + jQuery sandbox. There is no `package.json`, no bundler, no test runner — do not look for `npm install` / `npm run build` / `npm test`. Source files are served as-is by any static file server.

## Running locally

Pick any static server from the project root; there is no preferred command:

```bash
npx serve .                  # or: npx http-server .
python3 -m http.server 8080
```

Then open `http://localhost:8080`. VS Code's Live Server on `index.html` also works (the `.vscode/` folder is committed but currently empty config).

## Architecture notes that aren't obvious from a single file

- **Dependency loading order in `index.html` is load-bearing.** jQuery is included before Paper.js, and both before `src/main.js`. Paper.js's CDN build attaches `paper` to `window`, so module code in `src/main.js` (loaded with `type="module"`) uses the global `paper` directly — there is no `import paper from ...`.
- **Canvas auto-sizing relies on Paper.js's `resize` attribute**, not CSS or JS listeners. `<canvas id="myCanvas" resize>` paired with `paper.setup('myCanvas')` makes Paper.js track viewport size automatically. If you remove `resize`, you must wire size handling yourself.
- **`src/main.js` ships entirely commented out.** The commented block is the canonical "hello world" template (setup → draw a circle → `onFrame` animation → `onMouseDown` interaction); treat it as the intended starting scaffold rather than dead code to delete.
- The canvas id in HTML is `myCanvas`, but the commented sample calls `paper.setup('canvas')` — when uncommenting, change the argument to `'myCanvas'` (or pass the element itself) or the setup will silently fail.

## Conventions

- Business scripts go under `src/` and are loaded as ES modules from `index.html`. Add new modules by importing them from `src/main.js` rather than adding more `<script>` tags.
- Styles live in `src/style.css` and are global; there is no CSS scoping/processing.
