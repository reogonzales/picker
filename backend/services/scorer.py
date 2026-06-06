from __future__ import annotations

from typing import Any, Optional


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def _score_fundamental(f: dict) -> tuple[float, dict]:
    signals = {}

    # P/E: lower is better, rough bands
    pe = f.get("pe_trailing")
    if pe is not None and pe > 0:
        if pe < 15:
            signals["pe"] = 1.0
        elif pe < 25:
            signals["pe"] = 0.7
        elif pe < 40:
            signals["pe"] = 0.4
        else:
            signals["pe"] = 0.1

    # Revenue growth
    rev = f.get("revenue_growth_pct")
    if rev is not None:
        if rev > 20:
            signals["revenue_growth"] = 1.0
        elif rev > 10:
            signals["revenue_growth"] = 0.75
        elif rev > 0:
            signals["revenue_growth"] = 0.5
        else:
            signals["revenue_growth"] = 0.1

    # Profit margin
    pm = f.get("profit_margin_pct")
    if pm is not None:
        if pm > 20:
            signals["profit_margin"] = 1.0
        elif pm > 10:
            signals["profit_margin"] = 0.7
        elif pm > 0:
            signals["profit_margin"] = 0.4
        else:
            signals["profit_margin"] = 0.0

    # Debt/equity: lower is better
    de = f.get("debt_to_equity")
    if de is not None:
        if de < 50:
            signals["debt_equity"] = 1.0
        elif de < 150:
            signals["debt_equity"] = 0.6
        elif de < 300:
            signals["debt_equity"] = 0.3
        else:
            signals["debt_equity"] = 0.0

    # ROE
    roe = f.get("roe_pct")
    if roe is not None:
        if roe > 20:
            signals["roe"] = 1.0
        elif roe > 10:
            signals["roe"] = 0.6
        elif roe > 0:
            signals["roe"] = 0.3
        else:
            signals["roe"] = 0.0

    if not signals:
        return 50.0, {}
    score = sum(signals.values()) / len(signals) * 100
    return round(score, 1), signals


def _score_technical(t: dict) -> tuple[float, dict]:
    signals = {}

    # RSI: 40–60 neutral, <30 oversold (potential buy), >70 overbought
    rsi = t.get("rsi")
    if rsi is not None:
        if rsi < 30:
            signals["rsi"] = 0.8  # oversold, buying opportunity
        elif rsi < 45:
            signals["rsi"] = 0.9
        elif rsi < 60:
            signals["rsi"] = 0.7
        elif rsi < 70:
            signals["rsi"] = 0.4
        else:
            signals["rsi"] = 0.2  # overbought

    # Price vs SMA50
    vs50 = t.get("price_vs_sma50")
    if vs50 is not None:
        if -5 <= vs50 <= 10:
            signals["vs_sma50"] = 0.8  # near or just above 50d MA
        elif vs50 > 10:
            signals["vs_sma50"] = 0.5
        else:
            signals["vs_sma50"] = 0.3

    # Price vs SMA200 (golden/death cross proxy)
    vs200 = t.get("price_vs_sma200")
    if vs200 is not None:
        if vs200 > 0:
            signals["vs_sma200"] = 0.8
        else:
            signals["vs_sma200"] = 0.3

    # MACD histogram positive = bullish momentum
    macd = t.get("macd")
    if macd and isinstance(macd, dict):
        hist = macd.get("hist", 0) or 0
        signals["macd"] = 0.8 if hist > 0 else 0.3

    # MFI: volume-weighted RSI — oversold is bullish
    mfi = t.get("mfi")
    if mfi is not None:
        if mfi < 20:
            signals["mfi"] = 0.9   # oversold
        elif mfi < 40:
            signals["mfi"] = 0.75
        elif mfi < 60:
            signals["mfi"] = 0.6   # neutral
        elif mfi < 80:
            signals["mfi"] = 0.4
        else:
            signals["mfi"] = 0.2   # overbought

    # 52-week range: not at extreme top (potential overextension)
    w52 = t.get("week52_pct")
    if w52 is not None:
        if 40 <= w52 <= 80:
            signals["week52"] = 0.8
        elif w52 < 40:
            signals["week52"] = 0.5
        else:
            signals["week52"] = 0.4

    if not signals:
        return 50.0, {}
    score = sum(signals.values()) / len(signals) * 100
    return round(score, 1), signals


def _score_etf(e: dict) -> tuple[float, dict]:
    signals = {}

    er = e.get("expense_ratio_pct")
    if er is not None:
        if er < 0.1:
            signals["expense_ratio"] = 1.0
        elif er < 0.3:
            signals["expense_ratio"] = 0.7
        elif er < 0.75:
            signals["expense_ratio"] = 0.4
        else:
            signals["expense_ratio"] = 0.1

    dy = e.get("dividend_yield_pct")
    if dy is not None:
        if dy > 3:
            signals["dividend_yield"] = 0.9
        elif dy > 1:
            signals["dividend_yield"] = 0.7
        else:
            signals["dividend_yield"] = 0.5

    if not signals:
        return 50.0, {}
    score = sum(signals.values()) / len(signals) * 100
    return round(score, 1), signals


def compute(
    fundamental: dict,
    technical: dict,
    etf: Optional[dict],
) -> dict[str, Any]:
    f_score, f_signals = _score_fundamental(fundamental)
    t_score, t_signals = _score_technical(technical)

    if etf:
        e_score, e_signals = _score_etf(etf)
        composite = f_score * 0.40 + t_score * 0.35 + e_score * 0.25
        breakdown = {"fundamental": f_score, "technical": t_score, "etf": e_score}
    else:
        composite = f_score * 0.55 + t_score * 0.45
        breakdown = {"fundamental": f_score, "technical": t_score}

    composite = round(_clamp(composite, 0, 100), 1)

    if composite >= 65:
        verdict = "BUY"
    elif composite >= 40:
        verdict = "HOLD"
    else:
        verdict = "AVOID"

    return {
        "score": composite,
        "verdict": verdict,
        "breakdown": breakdown,
        "signals": {
            "fundamental": f_signals,
            "technical": t_signals,
            **({"etf": e_signals} if etf else {}),
        },
    }
