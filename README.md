# Cosine Gaming

Static website for [cosinegaming.com](https://cosinegaming.com).

## Build

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
bash scripts/install_ruffle.sh   # once; Flash games via Ruffle
.venv/bin/python build.py
```

The generated site is written to `site/`. Serve it with any static host (Netlify, GitHub Pages, nginx, etc.).

## Development

Preview locally after building:

```bash
.venv/bin/python -m http.server --directory site
```

## Source layout

- `templates/` — Jinja2 HTML templates and `games.json`
- `static/` — CSS, JS, images, and embedded games (some are git submodules)
- `build.py` — renders templates into `site/`

Initialize game submodules before building if you need the full game assets:

```bash
git submodule update --init --recursive
```
