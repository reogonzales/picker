from __future__ import annotations

from datetime import date
from typing import Any, List, Optional

import pandas as pd
import yfinance as yf
from .fetcher import get_info, get_history


def is_etf(info: dict) -> bool:
    qt = info.get("quoteType", "")
    return qt.upper() in ("ETF", "MUTUALFUND")


def _get_top_holdings(ticker_obj) -> list[dict]:
    holdings = []
    try:
        h = ticker_obj.funds_data.top_holdings
        if h is None or h.empty:
            return holdings
        for symbol, row in h.head(10).iterrows():
            name = row.get("Name") or row.get("holdingName") or symbol
            pct = row.get("Holding Percent") or row.get("holdingPercent") or 0
            holdings.append({
                "symbol": symbol,
                "name": name,
                "weight_pct": round(float(pct) * 100, 2),
            })
    except Exception:
        pass
    return holdings


def _get_expense_ratio(ticker_obj, info: dict) -> Optional[float]:
    try:
        ops = ticker_obj.funds_data.fund_operations
        if ops is not None and not ops.empty:
            for idx in ops.index:
                if "expense" in str(idx).lower():
                    val = ops.loc[idx].iloc[0]
                    if val and str(val) != "<NA>":
                        return round(float(val) * 100, 3)
    except Exception:
        pass
    for field in ("annualReportExpenseRatio", "expenseRatio", "totalExpenseRatio"):
        v = info.get(field)
        if v:
            return round(float(v) * 100, 3)
    return None


def _perf_from(hist: pd.DataFrame, from_date: date) -> Optional[float]:
    """Total % return from from_date to latest close."""
    if hist is None or hist.empty or "Close" not in hist.columns:
        return None
    closes = hist["Close"].dropna()
    if closes.empty:
        return None
    target = pd.Timestamp(from_date)
    if closes.index.tz is not None:
        target = target.tz_localize(closes.index.tz)
    available = closes[closes.index >= target]
    if available.empty:
        return None
    start = float(available.iloc[0])
    end = float(closes.iloc[-1])
    if start <= 0:
        return None
    return round((end / start - 1) * 100, 2)


def _perf_years(hist: pd.DataFrame, years: int, annualize: bool = True) -> Optional[float]:
    """Return over the last `years` years, optionally annualized."""
    if hist is None or hist.empty or "Close" not in hist.columns:
        return None
    closes = hist["Close"].dropna()
    if len(closes) < 10:
        return None
    latest_ts = closes.index[-1]
    target = latest_ts - pd.DateOffset(years=years)
    available = closes[closes.index >= target]
    if len(available) < 10:
        return None
    start = float(available.iloc[0])
    end = float(closes.iloc[-1])
    if start <= 0:
        return None
    total = (end / start - 1) * 100
    if not annualize or years <= 1:
        return round(total, 2)
    actual_years = (latest_ts - available.index[0]).days / 365.25
    if actual_years < 0.5:
        return None
    annualized = ((end / start) ** (1.0 / actual_years) - 1) * 100
    return round(annualized, 2)


def _compute_performance(ticker: str, info: dict) -> dict:
    hist = get_history(ticker, "max")
    today = date.today()

    ytd_start = date(today.year, 1, 1)
    mtd_start = date(today.year, today.month, 1)
    q_month = ((today.month - 1) // 3) * 3 + 1
    qtd_start = date(today.year, q_month, 1)

    since_inception = None
    inception_ts = info.get("fundInceptionDate")
    if inception_ts:
        try:
            inception_date = date.fromtimestamp(int(inception_ts))
            since_inception = _perf_from(hist, inception_date)
        except Exception:
            pass

    return {
        "ytd_pct": _perf_from(hist, ytd_start),
        "mtd_pct": _perf_from(hist, mtd_start),
        "qtd_pct": _perf_from(hist, qtd_start),
        "perf_1y_pct": _perf_years(hist, 1, annualize=False),
        "perf_3y_pct": _perf_years(hist, 3, annualize=True),
        "perf_5y_pct": _perf_years(hist, 5, annualize=True),
        "since_inception_pct": since_inception,
        "inception_date": str(date.fromtimestamp(int(inception_ts))) if inception_ts else None,
    }


def compute(ticker: str, all_tickers: Optional[List[str]] = None) -> Optional[dict[str, Any]]:
    info = get_info(ticker)
    if not is_etf(info):
        return None

    t = yf.Ticker(ticker)
    holdings = _get_top_holdings(t)
    expense_ratio = _get_expense_ratio(t, info)

    # Holdings overlap with other ETFs in watchlist
    overlap = {}
    if all_tickers and holdings:
        my_symbols = {h["symbol"] for h in holdings}
        my_weights = {h["symbol"]: h["weight_pct"] for h in holdings}
        for other in all_tickers:
            if other.upper() == ticker.upper():
                continue
            try:
                other_info = get_info(other)
                if not is_etf(other_info):
                    continue
                ot = yf.Ticker(other)
                other_holdings = _get_top_holdings(ot)
                if not other_holdings:
                    continue
                other_symbols = {h["symbol"] for h in other_holdings}
                common = my_symbols & other_symbols
                overlap_pct = sum(my_weights.get(s, 0) for s in common)
                overlap[other.upper()] = round(overlap_pct, 1)
            except Exception:
                pass

    performance = _compute_performance(ticker, info)

    raw_3y = info.get("threeYearAverageReturn")
    raw_5y = info.get("fiveYearAverageReturn")

    return {
        "expense_ratio_pct": expense_ratio,
        "aum": info.get("totalAssets"),
        "dividend_yield_pct": round(float(info.get("yield", 0) or 0) * 100, 2)
        if info.get("yield") else None,
        "top_holdings": holdings,
        "overlap": overlap,
        "num_holdings": len(holdings),
        "category": info.get("category"),
        "fund_family": info.get("fundFamily"),
        "beta_3y": info.get("beta3Year"),
        # Prefer calculated returns; fall back to yfinance reported values
        "ytd_pct": performance["ytd_pct"],
        "mtd_pct": performance["mtd_pct"],
        "qtd_pct": performance["qtd_pct"],
        "perf_1y_pct": performance["perf_1y_pct"],
        "perf_3y_pct": performance["perf_3y_pct"] or (round(raw_3y * 100, 2) if raw_3y else None),
        "perf_5y_pct": performance["perf_5y_pct"] or (round(raw_5y * 100, 2) if raw_5y else None),
        "since_inception_pct": performance["since_inception_pct"],
        "inception_date": performance["inception_date"],
    }
