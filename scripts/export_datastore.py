#!/usr/bin/env python3
"""Export Blog_Entry, Question, and Quote entities from Cloud Datastore to JSON.

Uses the Datastore REST API (no gRPC / libstdc++ required).

Prerequisites:
  gcloud auth application-default login
  gcloud config set project cosine-gaming

  .venv/bin/pip install -r scripts/requirements.txt

Usage:
  .venv/bin/python scripts/export_datastore.py
  .venv/bin/python scripts/export_datastore.py --output-dir data
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import google.auth
import google.auth.transport.requests
import requests

PROJECT = "cosine-gaming"
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "data"
API = "https://datastore.googleapis.com/v1/projects/{project}:runQuery"


def get_access_token() -> str:
    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/datastore"]
    )
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token


def decode_value(prop: dict):
    if "nullValue" in prop:
        return None
    if "booleanValue" in prop:
        return prop["booleanValue"]
    if "integerValue" in prop:
        return int(prop["integerValue"])
    if "doubleValue" in prop:
        return prop["doubleValue"]
    if "timestampValue" in prop:
        return prop["timestampValue"]
    if "stringValue" in prop:
        return prop["stringValue"]
    if "blobValue" in prop:
        return prop["blobValue"]
    if "arrayValue" in prop:
        values = prop["arrayValue"].get("values") or []
        return [decode_value(v) for v in values]
    if "entityValue" in prop:
        nested = prop["entityValue"].get("properties") or {}
        return {k: decode_value(v) for k, v in nested.items()}
    raise ValueError(f"Unknown property type: {prop!r}")


def decode_entity(entity: dict) -> dict:
    props = entity.get("properties") or {}
    out = {name: decode_value(value) for name, value in props.items()}
    path = entity.get("key", {}).get("path") or []
    if path:
        last = path[-1]
        out["_key"] = last.get("name") or str(last.get("id", ""))
    return out


def run_gql(project: str, gql: str, token: str) -> list[dict]:
    url = API.format(project=project)
    headers = {"Authorization": f"Bearer {token}"}
    cursor = None
    results: list[dict] = []

    while True:
        body: dict = {
            "gqlQuery": {"queryString": gql, "allowLiterals": True},
        }
        if cursor:
            body["gqlQuery"]["startCursor"] = cursor

        resp = requests.post(url, headers=headers, json=body, timeout=120)
        if not resp.ok:
            raise RuntimeError(
                f"Datastore API error {resp.status_code}: {resp.text}"
            )

        batch = resp.json().get("batch") or {}
        for item in batch.get("entityResults") or []:
            entity = item.get("entity")
            if entity:
                results.append(decode_entity(entity))

        if batch.get("moreResults") != "NOT_FINISHED":
            break
        cursor = batch.get("endCursor")
        if not cursor:
            break

    return results


def export_blog(project: str, token: str) -> list[dict]:
    return run_gql(project, "SELECT * FROM Blog_Entry ORDER BY index DESC", token)


def export_questions(project: str, token: str, answered_only: bool) -> list[dict]:
    if answered_only:
        gql = "SELECT * FROM Question WHERE answered = true ORDER BY date DESC"
    else:
        gql = "SELECT * FROM Question ORDER BY date DESC"
    return run_gql(project, gql, token)


def export_quotes(project: str, token: str) -> list[dict]:
    return run_gql(project, "SELECT * FROM Quote ORDER BY date DESC", token)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export Datastore blog, questions, and quotes to JSON"
    )
    parser.add_argument("--project", default=PROJECT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--include-unanswered", action="store_true")
    args = parser.parse_args()

    token = get_access_token()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    blog = export_blog(args.project, token)
    blog_path = args.output_dir / "blog.json"
    blog_path.write_text(json.dumps(blog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(blog)} blog posts to {blog_path}")

    questions = export_questions(
        args.project, token, answered_only=not args.include_unanswered
    )
    questions_path = args.output_dir / "questions.json"
    questions_path.write_text(
        json.dumps(questions, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(questions)} questions to {questions_path}")

    quotes = export_quotes(args.project, token)
    quotes_path = args.output_dir / "quotes.json"
    quotes_path.write_text(
        json.dumps(quotes, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(quotes)} quotes to {quotes_path}")


if __name__ == "__main__":
    main()
