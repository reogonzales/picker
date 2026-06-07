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

    # MOAT: count how many durable-advantage signals are strong
    moat_signals = 0
    gross_m = _safe(info.get("grossMargins"))
    if gross_m is not None and gross_m > 0.40: moat_signals += 1
    op_m = _safe(info.get("operatingMargins"))
    if op_m is not None and op_m > 0.20: moat_signals += 1
    roe = _safe(info.get("returnOnEquity"))
    if roe is not None and roe > 0.20: moat_signals += 1
    de = _safe(info.get("debtToEquity"))
    if de is not None and de < 50: moat_signals += 1
    if fcf_per_share is not None and fcf_per_share > 0: moat_signals += 1
    if moat_signals >= 4:
        moat_label = "Wide"
    elif moat_signals >= 2:
        moat_label = "Narrow"
    else:
        moat_label = "None"

    # DCF: 10-year two-stage model using FCF/share
    # Stage 1 (yr 1-5): growth capped at 25%; Stage 2 (yr 6-10): half that; terminal 3%, discount 10%
    dcf_pct = None
    current_price = _safe(info.get("currentPrice") or info.get("regularMarketPrice"))
    if fcf_per_share and fcf_per_share > 0 and current_price and current_price > 0:
        try:
            raw_g = (rev_growth or 0) / 100
            g1 = min(max(raw_g, 0.0), 0.25)
            g2 = g1 / 2
            r, g_t = 0.10, 0.03
            pv, fcf = 0.0, fcf_per_share
            for yr in range(1, 6):
                fcf *= (1 + g1)
                pv += fcf / (1 + r) ** yr
            for yr in range(6, 11):
                fcf *= (1 + g2)
                pv += fcf / (1 + r) ** yr
            tv = fcf * (1 + g_t) / (r - g_t)
            pv += tv / (1 + r) ** 10
            dcf_pct = round((pv / current_price - 1) * 100, 1)
        except Exception:
            pass

    target_price = _safe(info.get("targetMeanPrice"))
    upside_pct = None
    if current_price and target_price and current_price > 0:
        upside_pct = round((target_price / current_price - 1) * 100, 1)

    raw_cap = info.get("marketCap")
    market_cap = int(raw_cap) if raw_cap is not None else None

    return {
        "market_cap": market_cap,
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
        "analyst_rating": _safe(info.get("recommendationMean")),
        "analyst_rating_key": info.get("recommendationKey"),
        "analyst_count": _safe(info.get("numberOfAnalystOpinions"), cast=int),
        "analyst_target_price": target_price,
        "analyst_upside_pct": upside_pct,
        "moat_label": moat_label,
        "moat_score": moat_signals,
        "dcf_pct": dcf_pct,
    }
