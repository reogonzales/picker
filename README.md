# Picker

A personal web app for evaluating stocks and ETFs side-by-side. Enter tickers manually or import a CSV, and get a scored watchlist with fundamental, technical, and ETF-specific metrics.

![Picker screenshot](https://github.com/reogonzales/picker/assets/picker-screenshot.png)

## Features

- **Composite score** — weighted 0–100 score with BUY / HOLD / AVOID verdict per ticker
- **Fundamental metrics** — P/E, EPS, revenue growth, profit margin, ROE, debt/equity, FCF
- **Technical metrics** — SMA50/200, RSI, MACD, 52-week range position, beta
- **ETF-specific metrics** — expense ratio, AUM, dividend yield, top 10 holdings
- **Holdings overlap** — pairwise overlap % between ETFs in your watchlist
- **Expandable rows** — click any row for a full metric + score signal breakdown
- **CSV import** — drag-and-drop a file with a `ticker` column to bulk-add
- **Persistent watchlist** — saved to `~/.picker/watchlist.json`

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.9+, FastAPI, yfinance |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Data | Yahoo Finance (free, no key) + optional Alpha Vantage |

## Getting started

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optionally add ALPHA_VANTAGE_KEY
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### Or just use the start script

```bash
./start.sh
```

Starts both servers. Frontend proxies API calls to `localhost:8000` so no CORS config needed in the browser.

## Alpha Vantage (optional)

Get a free key at [alphavantage.co](https://www.alphavantage.co/support/#api-key) and add it to `backend/.env`:

```
ALPHA_VANTAGE_KEY=your_key_here
```

Without it, RSI and MACD fall back to calculations from yfinance price history — results are essentially the same.

## Scoring

| Dimension | Stock weight | ETF weight |
|---|---|---|
| Fundamental | 55% | 40% |
| Technical | 45% | 35% |
| ETF-specific | — | 25% |

Scores map to verdicts: **BUY** ≥ 65 · **HOLD** 40–64 · **AVOID** < 40.

## CSV import format

```csv
ticker,notes
AAPL,core holding
VOO,broad market
QQQ,tech tilt
```

The `notes` column is optional.
