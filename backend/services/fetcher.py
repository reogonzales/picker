from __future__ import annotations

import os
import time
from typing import Any, Optional

import httpx
import yfinance as yf

_cache: dict[str, tuple[float, Any]] = {}
_TTL = 900  # 15 minutes


def _cached(key: str, fn):
    now = time.monotonic()
    if key in _cache and now - _cache[key][0] < _TTL:
        return _cache[key][1]
    result = fn()
    _cache[key] = (now, result)
    return result


def get_info(ticker: str) -> dict:
    return _cached(f"info:{ticker}", lambda: yf.Ticker(ticker).info)


def get_history(ticker: str, period: str = "1y") -> Any:
    return _cached(
        f"hist:{ticker}:{period}",
        lambda: yf.Ticker(ticker).history(period=period),
    )


def get_financials(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    return _cached(
        f"fin:{ticker}",
        lambda: {
            "income_stmt": t.income_stmt,
            "balance_sheet": t.balance_sheet,
            "cashflow": t.cashflow,
        },
    )


def get_alpha_vantage_rsi(ticker: str) -> Optional[float]:
    key = os.getenv("ALPHA_VANTAGE_KEY", "")
    if not key or key == "your_key_here":
        return None

    cache_key = f"av_rsi:{ticker}"
    now = time.monotonic()
    if cache_key in _cache and now - _cache[cache_key][0] < _TTL:
        return _cache[cache_key][1]

    try:
        url = (
            "https://www.alphavantage.co/query"
            f"?function=RSI&symbol={ticker}&interval=daily"
            f"&time_period=14&series_type=close&apikey={key}"
        )
        resp = httpx.get(url, timeout=10).json()
        data = resp.get("Technical Analysis: RSI", {})
        if data:
            latest = next(iter(data.values()))
            value = float(latest["RSI"])
            _cache[cache_key] = (now, value)
            return value
    except Exception:
        pass
    return None


def get_alpha_vantage_macd(ticker: str) -> Optional[dict]:
    key = os.getenv("ALPHA_VANTAGE_KEY", "")
    if not key or key == "your_key_here":
        return None

    cache_key = f"av_macd:{ticker}"
    now = time.monotonic()
    if cache_key in _cache and now - _cache[cache_key][0] < _TTL:
        return _cache[cache_key][1]

    try:
        url = (
            "https://www.alphavantage.co/query"
            f"?function=MACD&symbol={ticker}&interval=daily"
            f"&series_type=close&apikey={key}"
        )
        resp = httpx.get(url, timeout=10).json()
        data = resp.get("Technical Analysis: MACD", {})
        if data:
            latest = next(iter(data.values()))
            result = {
                "macd": float(latest["MACD"]),
                "signal": float(latest["MACD_Signal"]),
                "hist": float(latest["MACD_Hist"]),
            }
            _cache[cache_key] = (now, result)
            return result
    except Exception:
        pass
    return None
