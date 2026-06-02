#!/usr/bin/env python3
"""Build a fully static copy of the Cosine Gaming site from Jinja templates."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "templates"
STATIC_SRC = ROOT / "static"
DATA = ROOT / "data"
SITE = ROOT / "site"

BLOG_PAGE_SIZE = 5

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
/swarm/play /swarm/play.html 200
/swarm/play/ /swarm/play.html 301
/blog/page/1 /blog/ 301
/blog/page/1/ /blog/ 301
"""


class UserAgent:
    """Minimal stand-in for Werkzeug user agents used in download instructions."""

    platform: str | None = None
    browser: str | None = None


def regex_filter(s: str, find: str, replace: str = "") -> str:
    return re.sub(find, replace, s)


def question_date_filter(dt: datetime) -> str:
    hour = dt.hour % 12 or 12
    return f"{dt.strftime('%Y-%m-%d')} {hour}:{dt.strftime('%M')}{dt.strftime('%p').lower()}"


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_json(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def format_blog_post(text: str) -> Markup:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return Markup(text.replace("\n", '</p><p class="indent">'))


def load_blog_entries() -> list[SimpleNamespace]:
    entries = []
    for row in load_json(DATA / "blog.json"):
        dt = parse_iso(row["date"])
        entries.append(
            SimpleNamespace(
                index=row["index"],
                title=row["title"],
                author=row["author"],
                post=format_blog_post(row["post"]),
                date=dt.date(),
            )
        )
    return entries


def load_questions() -> list[SimpleNamespace]:
    questions = []
    for row in load_json(DATA / "questions.json"):
        questions.append(
            SimpleNamespace(
                question=Markup(row["question"]),
                answer=Markup(row.get("answer") or ""),
                date=parse_iso(row["date"]),
            )
        )
    return questions


def load_quotes() -> list[SimpleNamespace]:
    quotes = []
    for row in load_json(DATA / "quotes.json"):
        quotes.append(
            SimpleNamespace(
                name=row["name"],
                quote=Markup(row["quote"]),
                attribution=Markup(row["attribution"]),
            )
        )
    return quotes


def blog_page_entries(entries: list[SimpleNamespace], page: int) -> list[SimpleNamespace]:
    if not entries:
        return []
    max_index = max(entry.index for entry in entries)
    highest = max_index - (page - 1) * BLOG_PAGE_SIZE
    batch = [entry for entry in entries if entry.index <= highest]
    batch.sort(key=lambda entry: -entry.index)
    return batch[:BLOG_PAGE_SIZE]


def blog_page_for_entry(entry: SimpleNamespace, entries: list[SimpleNamespace]) -> int:
    max_index = max(e.index for e in entries)
    return (max_index - entry.index) // BLOG_PAGE_SIZE + 1


def build_blog_pages(env: Environment, entries: list[SimpleNamespace]) -> None:
    page1_html = render(
        env,
        "blog.html",
        page="blog",
        entries=blog_page_entries(entries, 1),
        blog_page=1,
        static=True,
    )
    write_page("blog/index.html", page1_html)
    write_page("blog/page/1/index.html", page1_html)

    page = 2
    while True:
        batch = blog_page_entries(entries, page)
        if not batch:
            break
        write_page(
            f"blog/page/{page}/index.html",
            render(
                env,
                "blog.html",
                page="blog",
                entries=batch,
                blog_page=page,
                static=True,
            ),
        )
        if batch[-1].index <= 0:
            break
        page += 1

    for entry in entries:
        write_page(
            f"blog/post/{entry.index}/index.html",
            render(
                env,
                "blog.html",
                page="blog",
                entries=[entry],
                blog_page=blog_page_for_entry(entry, entries),
                full=True,
                static=True,
            ),
        )


def build_questions_page(env: Environment, questions: list[SimpleNamespace]) -> None:
    write_page(
        "questions/index.html",
        render(
            env,
            "questions.html",
            questions=questions,
            page="questions",
            static=True,
        ),
    )


def build_quote_page(env: Environment, quotes: list[SimpleNamespace]) -> None:
    write_page(
        "quote/index.html",
        render(env, "quote.html", quotes=quotes),
    )


def setup_env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES), followlinks=True),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["regex"] = regex_filter
    env.filters["question_date"] = question_date_filter
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


# Entry pages that extend standard.html (assets live under /static/<name>/).
JINJA_ENTRY_GAMES: dict[str, str] = {
    "entropy": "entropy.html",
}


def _is_jinja_template(path: Path) -> bool:
    if not path.is_file():
        return False
    head = path.read_text(encoding="utf-8", errors="replace")[:800]
    return "{%" in head and "extends" in head


def deploy_game_entry(env: Environment, url: str) -> bool:
    """Publish /{url}/ using assets from static/{url}/."""
    src = STATIC_SRC / url
    if not src.is_dir():
        single = STATIC_SRC / f"{url}.html"
        if single.is_file():
            write_page(f"{url}/index.html", single.read_text(encoding="utf-8"))
            return True
        print(f"  skip {url}/ (run: git submodule update --init static/{url})")
        return False

    template_name = JINJA_ENTRY_GAMES.get(url)
    if template_name is None:
        linked = TEMPLATES / f"{url}.html"
        if linked.is_file() and _is_jinja_template(linked):
            template_name = f"{url}.html"

    if template_name:
        write_page(f"{url}/index.html", render(env, template_name, page=url))
        return True

    entry = src / f"{url}.html"
    if not entry.is_file():
        entry = src / "index.html"
    if not entry.is_file():
        print(f"  skip {url}/ (no entry HTML in static/{url})")
        return False
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


def _swarm_play_html(game_html: str) -> str:
    """Relative script/asset paths target /swarm/, not /swarm/play/."""
    if "<base " in game_html:
        return game_html
    return game_html.replace("<head>", '<head>\n\t\t<base href="/swarm/">', 1)


def build_swarm_pages(env: Environment) -> None:
    """Emit swarm pages beside game assets (same layout as legacy /swarm/play)."""
    swarm_dir = TEMPLATES / "swarm"
    if not swarm_dir.is_dir():
        return
    for path in sorted(swarm_dir.glob("*.html")):
        name = path.stem
        if name == "game":
            game_html = path.read_text(encoding="utf-8")
            # play.html: scripts resolve as siblings under /swarm/
            write_page("swarm/play.html", game_html)
            # play/: for href="play" — needs <base> so assets are not under /swarm/play/
            write_page("swarm/play/index.html", _swarm_play_html(game_html))
            continue
        out = "swarm/index.html" if name == "index" else f"swarm/{name}.html"
        if _is_jinja_template(path):
            html = render(env, f"swarm/{name}.html")
        else:
            html = path.read_text(encoding="utf-8")
        write_page(out, html)


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
        deploy_game_entry(env, url)


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
            deploy_game_entry(env, "creased")
            continue
        if not template_path.is_file():
            continue
        context: dict = {"page": page, "static": True}
        if page == "contact":
            context["games"] = games
            context["responses"] = empty_survey
        write_page(f"{page}/index.html", render(env, template, **context))

    write_page("404.html", render(env, "404.html"))

    blog_entries = load_blog_entries()
    questions = load_questions()
    quotes = load_quotes()
    build_blog_pages(env, blog_entries)
    build_questions_page(env, questions)
    build_quote_page(env, quotes)

    copy_static_assets()
    build_game_pages(env, games, ua)
    build_swarm_pages(env)

    (SITE / "_redirects").write_text(REDIRECTS, encoding="utf-8")

    print(f"Built static site in {SITE}")


if __name__ == "__main__":
    main()
