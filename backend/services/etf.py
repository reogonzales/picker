from __future__ import annotations

from typing import Any, List, Optional
import yfinance as yf
from .fetcher import get_info


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
            # yfinance 1.x: columns are "Name" and "Holding Percent"
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
    # Try fund_operations first (yfinance 1.x)
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
    # Fallback: info dict fields
    for field in ("annualReportExpenseRatio", "expenseRatio", "totalExpenseRatio"):
        v = info.get(field)
        if v:
            return round(float(v) * 100, 3)
    return None


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

    return {
        "expense_ratio_pct": expense_ratio,
        "aum": info.get("totalAssets"),
        "dividend_yield_pct": round(float(info.get("yield", 0) or 0) * 100, 2)
        if info.get("yield") else None,
        "top_holdings": holdings,
        "overlap": overlap,
    }
