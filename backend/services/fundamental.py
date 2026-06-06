from typing import Any
from .fetcher import get_info, get_financials


def _safe(val, cast=float, default=None):
    try:
        return cast(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _pct(val, default=None):
    v = _safe(val)
    return round(v * 100, 2) if v is not None else default


def compute(ticker: str) -> dict[str, Any]:
    info = get_info(ticker)
    fins = get_financials(ticker)

    # Revenue growth YoY from income statement
    rev_growth = None
    try:
        inc = fins["income_stmt"]
        if inc is not None and not inc.empty and "Total Revenue" in inc.index:
            revs = inc.loc["Total Revenue"].dropna()
            if len(revs) >= 2:
                rev_growth = round((revs.iloc[0] / revs.iloc[1] - 1) * 100, 2)
    except Exception:
        pass

    # FCF from cashflow
    fcf_per_share = None
    try:
        cf = fins["cashflow"]
        shares = _safe(info.get("sharesOutstanding"))
        if cf is not None and not cf.empty and shares and shares > 0:
            ops = cf.loc["Operating Cash Flow"].iloc[0] if "Operating Cash Flow" in cf.index else None
            capex = cf.loc["Capital Expenditure"].iloc[0] if "Capital Expenditure" in cf.index else 0
            if ops is not None:
                fcf = float(ops) + float(capex)  # capex is negative in yfinance
                fcf_per_share = round(fcf / shares, 2)
    except Exception:
        pass

    return {
        "pe_trailing": _safe(info.get("trailingPE")),
        "pe_forward": _safe(info.get("forwardPE")),
        "eps_trailing": _safe(info.get("trailingEps")),
        "eps_forward": _safe(info.get("forwardEps")),
        "peg_ratio": _safe(info.get("pegRatio")),
        "revenue_growth_pct": rev_growth,
        "profit_margin_pct": _pct(info.get("profitMargins")),
        "operating_margin_pct": _pct(info.get("operatingMargins")),
        "roe_pct": _pct(info.get("returnOnEquity")),
        "debt_to_equity": _safe(info.get("debtToEquity")),
        "current_ratio": _safe(info.get("currentRatio")),
        "fcf_per_share": fcf_per_share,
    }
