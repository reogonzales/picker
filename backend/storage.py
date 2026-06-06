from __future__ import annotations

import json
from pathlib import Path
from typing import Any, List

_PATH = Path.home() / ".picker" / "watchlist.json"


def _load() -> dict[str, Any]:
    if not _PATH.exists():
        return {"tickers": []}
    return json.loads(_PATH.read_text())


def _save(data: dict[str, Any]) -> None:
    _PATH.parent.mkdir(parents=True, exist_ok=True)
    _PATH.write_text(json.dumps(data, indent=2))


def list_tickers() -> List[dict]:
    return _load().get("tickers", [])


def add_ticker(ticker: str, notes: str = "") -> None:
    data = _load()
    existing = {t["ticker"] for t in data["tickers"]}
    if ticker.upper() not in existing:
        data["tickers"].append({"ticker": ticker.upper(), "notes": notes})
        _save(data)


def remove_ticker(ticker: str) -> bool:
    data = _load()
    before = len(data["tickers"])
    data["tickers"] = [t for t in data["tickers"] if t["ticker"] != ticker.upper()]
    _save(data)
    return len(data["tickers"]) < before
