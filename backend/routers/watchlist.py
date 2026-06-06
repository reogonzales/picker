from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import storage

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class AddRequest(BaseModel):
    ticker: str
    notes: str = ""


@router.get("")
def get_watchlist():
    return storage.list_tickers()


@router.post("", status_code=201)
def add_to_watchlist(req: AddRequest):
    ticker = req.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=422, detail="Ticker cannot be empty")
    storage.add_ticker(ticker, req.notes)
    return {"ticker": ticker, "notes": req.notes}


@router.delete("/{ticker}", status_code=204)
def remove_from_watchlist(ticker: str):
    removed = storage.remove_ticker(ticker)
    if not removed:
        raise HTTPException(status_code=404, detail=f"{ticker} not in watchlist")
