#!/usr/bin/env python3
"""Build a fully static copy of the Cosine Gaming site from Jinja templates."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
STATIC_SRC = ROOT / "static"
SITE = ROOT / "site"

PLATFORM_TO_STRING = {
    "windows": "Windows",
    "macos": "Mac",
    "linux": "GNU/Linux",
}

STATIC_PAGES = (
    "about",
    "beta",
    "contact",
    "donate",
    "privacy",
    "leechblock",
    "list",
    "creased",
)

REDIRECTS = """\
/ /games/ 301
/games /games/ 301
/index.html /games/ 301
/pale-white-dot /pale-white-dot/ 301
"""


class UserAgent:
    """Minimal stand-in for Werkzeug user agents used in download instructions."""

    platform: str | None = None
    browser: str | None = None


def regex_filter(s: str, find: str, replace: str = "") -> str:
    return re.sub(find, replace, s)


def setup_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["regex"] = regex_filter
    return env


def load_descriptions(env: Environment) -> dict[str, str]:
    template = env.get_template("game-descriptions.html")
    descriptions: dict[str, str] = {}
    for name, block in template.blocks.items():
        descriptions[name] = "".join(block(template.new_context({})))
    return descriptions


def load_games(env: Environment, descriptions: dict[str, str]) -> list[dict]:
    games = json.loads(env.get_template("games.json").render())
    for game in games:
        if "url" not in game:
            game["url"] = game["name"].lower().replace(" ", "-")
        js_name = game["url"].replace("-", "_")
        if js_name in descriptions:
            game["description"] = Markup(descriptions[js_name])
        if "extract" not in game:
            game["extract"] = False
        if "size" in game:
            game.setdefault("swf", f"/static/online-games/{game['url']}.swf")
    return games


def render(env: Environment, template_name: str, **context) -> str:
    return env.get_template(template_name).render(**context)


def copy_static_game(url: str) -> bool:
    """Copy a self-contained game directory from static/ into the site."""
    src = STATIC_SRC / url
    if not src.is_dir():
        single = STATIC_SRC / f"{url}.html"
        if single.is_file():
            write_page(f"{url}/index.html", single.read_text(encoding="utf-8"))
            return True
        print(f"  skip {url}/ (run: git submodule update --init static/{url})")
        return False
    dest = SITE / url
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, symlinks=True)
    entry = src / f"{url}.html"
    if not entry.is_file():
        entry = src / "index.html"
    if entry.is_file():
        write_page(f"{url}/index.html", entry.read_text(encoding="utf-8"))
    return True


def write_page(relative_path: str, html: str) -> None:
    path = SITE / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")


def redirect_page(target: str) -> str:
    return (
        "<!DOCTYPE html><html><head>"
        f'<meta http-equiv="refresh" content="0; url={target}">'
        f'<link rel="canonical" href="{target}">'
        "</head><body>"
        f'<p><a href="{target}">Continue</a></p>'
        "</body></html>"
    )


def copy_static_assets() -> None:
    dest = SITE / "static"
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(STATIC_SRC, dest, symlinks=True)

    favicon = STATIC_SRC / "favicon.ico"
    if favicon.exists():
        shutil.copy2(favicon, SITE / "favicon.ico")

    robots = STATIC_SRC / "robots.txt"
    if robots.exists():
        shutil.copy2(robots, SITE / "robots.txt")

    switch = STATIC_SRC / "switch.html"
    if switch.exists():
        write_page("switch/index.html", switch.read_text(encoding="utf-8"))

    pwd = STATIC_SRC / "pwd"
    if pwd.is_dir():
        pwd_dest = SITE / "pale-white-dot"
        if pwd_dest.exists():
            shutil.rmtree(pwd_dest)
        shutil.copytree(pwd, pwd_dest, symlinks=True)

    swarm = STATIC_SRC / "swarm"
    if swarm.is_dir():
        swarm_dest = SITE / "swarm"
        if swarm_dest.exists():
            shutil.rmtree(swarm_dest)
        shutil.copytree(swarm, swarm_dest, symlinks=True)


def build_swarm_pages(env: Environment) -> None:
    swarm_dir = TEMPLATES / "swarm"
    if not swarm_dir.is_dir():
        return
    for path in sorted(swarm_dir.glob("*.html")):
        name = path.stem
        if name == "game":
            write_page("swarm/play/index.html", path.read_text(encoding="utf-8"))
            continue
        html = render(env, f"swarm/{name}.html")
        write_page(f"swarm/{name}/index.html", html)


def build_game_pages(env: Environment, games: list[dict], ua: UserAgent) -> None:
    for game in games:
        url = game["url"]
        if url in ("pale-white-dot", "switch"):
            continue
        if url == "swarm":
            continue
        if "size" in game:
            html = render(env, "online-game.html", game=game, page=url)
            write_page(f"{url}/index.html", html)
            continue
        if "download" in game:
            html = render(
                env,
                "download.html",
                game=game,
                user_agent=ua,
                platform_to_string=PLATFORM_TO_STRING,
                page=url,
            )
            write_page(f"{url}/index.html", html)
            for platform in game["download"]:
                html = render(
                    env,
                    "download.html",
                    game=game,
                    platform=platform,
                    user_agent=ua,
                    platform_to_string=PLATFORM_TO_STRING,
                    page=url,
                )
                write_page(f"{url}/{platform}/index.html", html)
            html = render(
                env,
                "download.html",
                game=game,
                platform="unknown",
                user_agent=ua,
                platform_to_string=PLATFORM_TO_STRING,
                page=url,
            )
            write_page(f"{url}/unknown/index.html", html)
            continue
        copy_static_game(url)


def main() -> None:
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()

    env = setup_env()
    descriptions = load_descriptions(env)
    games = load_games(env, descriptions)
    ua = UserAgent()

    write_page("index.html", redirect_page("/games/"))
    write_page(
        "games/index.html",
        render(
            env,
            "games.html",
            page="games",
            games=games,
            platform_to_string=PLATFORM_TO_STRING,
            user_agent=ua,
            static=True,
        ),
    )
    write_page(
        "old/index.html",
        render(env, "old.html", page="games", games=games, static=True),
    )

    empty_survey = {
        "favorite-game": "",
        "least-favorite-game": "",
        "change-in-game": "",
        "new-game": "",
        "game-rating": "5",
        "gameplay-rating": "5",
        "story-rating": "5",
        "graphics-rating": "5",
        "website-rating": "5",
        "content-rating": "5",
        "design-rating": "5",
        "comment": "",
        "email": "",
    }

    for page in STATIC_PAGES:
        template = f"{page}.html"
        template_path = TEMPLATES / template
        if page == "creased" and not template_path.is_file():
            copy_static_game("creased")
            continue
        if not template_path.is_file():
            continue
        context: dict = {"page": page, "static": True}
        if page == "contact":
            context["games"] = games
            context["responses"] = empty_survey
        write_page(f"{page}/index.html", render(env, template, **context))

    write_page("404.html", render(env, "404.html"))
    write_page(
        "blog/index.html",
        render(
            env,
            "blog.html",
            page="blog",
            entries=[],
            blog_page=1,
            static=True,
        ),
    )
    write_page(
        "questions/index.html",
        render(env, "questions.html", questions=[], page="questions", static=True),
    )
    write_page("quote/index.html", render(env, "quote.html", quotes=[], static=True))

    build_game_pages(env, games, ua)
    build_swarm_pages(env)
    copy_static_assets()

    (SITE / "_redirects").write_text(REDIRECTS, encoding="utf-8")

    print(f"Built static site in {SITE}")


if __name__ == "__main__":
    main()
