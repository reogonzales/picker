from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException, Query
from services import fundamental, technical, etf, scorer
from services.fetcher import get_info

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/{ticker}")
def analyze(ticker: str, watchlist: List[str] = Query(default=[])):
    ticker = ticker.upper()
    try:
        info = get_info(ticker)
        if not info or info.get("quoteType") is None:
            raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")

        fund = fundamental.compute(ticker)
        tech = technical.compute(ticker)
        etf_data = etf.compute(ticker, watchlist)
        score = scorer.compute(fund, tech, etf_data)

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName", ticker),
            "type": info.get("quoteType", "EQUITY"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "fundamental": fund,
            "technical": tech,
            "etf": etf_data,
            "score": score,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
