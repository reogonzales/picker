from __future__ import annotations

from typing import Any, Optional
import pandas as pd
from .fetcher import get_history, get_info, get_alpha_vantage_rsi, get_alpha_vantage_macd


def _rsi_from_prices(closes: pd.Series, period: int = 14) -> Optional[float]:
    if len(closes) < period + 1:
        return None
    delta = closes.diff().dropna()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, float("nan"))
    rsi = 100 - (100 / (1 + rs))
    val = rsi.dropna().iloc[-1] if not rsi.dropna().empty else None
    return round(float(val), 2) if val is not None else None


def _mfi_from_hist(hist: pd.DataFrame, period: int = 14) -> Optional[float]:
    needed = {"High", "Low", "Close", "Volume"}
    if not needed.issubset(hist.columns) or len(hist) < period + 1:
        return None
    tp = (hist["High"] + hist["Low"] + hist["Close"]) / 3
    rmf = tp * hist["Volume"]
    pos = rmf.where(tp > tp.shift(1), 0.0)
    neg = rmf.where(tp < tp.shift(1), 0.0)
    pos_sum = pos.rolling(period).sum()
    neg_sum = neg.rolling(period).sum()
    mfr = pos_sum / neg_sum.replace(0, float("nan"))
    mfi = 100 - (100 / (1 + mfr))
    val = mfi.dropna().iloc[-1] if not mfi.dropna().empty else None
    return round(float(val), 1) if val is not None else None


def _macd_from_prices(closes: pd.Series) -> Optional[dict]:
    if len(closes) < 35:
        return None
    ema12 = closes.ewm(span=12, adjust=False).mean()
    ema26 = closes.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal = macd_line.ewm(span=9, adjust=False).mean()
    hist = macd_line - signal
    return {
        "macd": round(float(macd_line.iloc[-1]), 4),
        "signal": round(float(signal.iloc[-1]), 4),
        "hist": round(float(hist.iloc[-1]), 4),
    }


def compute(ticker: str) -> dict[str, Any]:
    info = get_info(ticker)
    hist = get_history(ticker, "1y")

    current_price = None
    sma50 = sma200 = None
    rsi = None
    macd = None
    mfi = None
    week52_pct = None
    beta = None
    avg_vol = None
    curr_vol = None

    if hist is not None and not hist.empty:
        closes = hist["Close"].dropna()
        current_price = round(float(closes.iloc[-1]), 2) if len(closes) > 0 else None

        if len(closes) >= 50:
            sma50 = round(float(closes.rolling(50).mean().iloc[-1]), 2)
        if len(closes) >= 200:
            sma200 = round(float(closes.rolling(200).mean().iloc[-1]), 2)

        rsi = _rsi_from_prices(closes)
        macd = _macd_from_prices(closes)
        mfi = _mfi_from_hist(hist)

        if len(closes) >= 252:
            low52 = float(closes.tail(252).min())
            high52 = float(closes.tail(252).max())
        else:
            low52 = float(closes.min())
            high52 = float(closes.max())

        if high52 > low52 and current_price is not None:
            week52_pct = round((current_price - low52) / (high52 - low52) * 100, 1)

        if "Volume" in hist.columns and len(hist) >= 20:
            avg_vol = int(hist["Volume"].tail(20).mean())
            curr_vol = int(hist["Volume"].iloc[-1])

    # Override RSI/MACD with Alpha Vantage if available
    av_rsi = get_alpha_vantage_rsi(ticker)
    if av_rsi is not None:
        rsi = av_rsi

    av_macd = get_alpha_vantage_macd(ticker)
    if av_macd is not None:
        macd = av_macd

    beta = round(float(info.get("beta", 0) or 0), 2) if info.get("beta") else None

    raw_short = info.get("shortPercentOfFloat")
    short_pct = round(float(raw_short) * 100, 1) if raw_short is not None else None

    return {
        "current_price": current_price,
        "sma50": sma50,
        "sma200": sma200,
        "price_vs_sma50": (
            round((current_price / sma50 - 1) * 100, 2)
            if current_price and sma50 else None
        ),
        "price_vs_sma200": (
            round((current_price / sma200 - 1) * 100, 2)
            if current_price and sma200 else None
        ),
        "rsi": rsi,
        "macd": macd,
        "mfi": mfi,
        "short_pct": short_pct,
        "week52_pct": week52_pct,
        "beta": beta,
        "avg_volume_20d": avg_vol,
        "current_volume": curr_vol,
    }
