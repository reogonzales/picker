import csv
import io
from fastapi import APIRouter, HTTPException, UploadFile, File
import storage

router = APIRouter(prefix="/import", tags=["import"])


@router.post("")
async def import_csv(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if "ticker" not in (reader.fieldnames or []):
        raise HTTPException(status_code=400, detail="CSV must have a 'ticker' column")

    added = []
    skipped = []
    for row in reader:
        ticker = (row.get("ticker") or "").strip().upper()
        if not ticker:
            continue
        notes = (row.get("notes") or "").strip()
        existing = {t["ticker"] for t in storage.list_tickers()}
        if ticker in existing:
            skipped.append(ticker)
        else:
            storage.add_ticker(ticker, notes)
            added.append(ticker)

    return {"added": added, "skipped": skipped}
