export interface WatchlistEntry {
  ticker: string;
  notes: string;
}

export interface MacdData {
  macd: number;
  signal: number;
  hist: number;
}

export interface FundamentalData {
  pe_trailing: number | null;
  pe_forward: number | null;
  eps_trailing: number | null;
  eps_forward: number | null;
  peg_ratio: number | null;
  revenue_growth_pct: number | null;
  profit_margin_pct: number | null;
  operating_margin_pct: number | null;
  roe_pct: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  fcf_per_share: number | null;
  analyst_rating: number | null;
  analyst_rating_key: string | null;
  analyst_count: number | null;
  analyst_target_price: number | null;
  analyst_upside_pct: number | null;
}

export interface TechnicalData {
  current_price: number | null;
  sma50: number | null;
  sma200: number | null;
  price_vs_sma50: number | null;
  price_vs_sma200: number | null;
  rsi: number | null;
  macd: MacdData | null;
  mfi: number | null;
  short_pct: number | null;
  week52_pct: number | null;
  beta: number | null;
  avg_volume_20d: number | null;
  current_volume: number | null;
}

export interface EtfHolding {
  symbol: string;
  name: string;
  weight_pct: number;
}

export interface EtfData {
  expense_ratio_pct: number | null;
  aum: number | null;
  dividend_yield_pct: number | null;
  top_holdings: EtfHolding[];
  overlap: Record<string, number>;
}

export interface ScoreBreakdown {
  fundamental: number;
  technical: number;
  etf?: number;
}

export interface ScoreData {
  score: number;
  verdict: "BUY" | "HOLD" | "AVOID";
  breakdown: ScoreBreakdown;
  signals: Record<string, Record<string, number>>;
}

export interface TickerAnalysis {
  ticker: string;
  name: string;
  type: string;
  sector: string | null;
  industry: string | null;
  fundamental: FundamentalData;
  technical: TechnicalData;
  etf: EtfData | null;
  score: ScoreData;
}

const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getWatchlist: () => request<WatchlistEntry[]>("/watchlist"),

  addTicker: (ticker: string, notes = "") =>
    request<WatchlistEntry>("/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, notes }),
    }),

  removeTicker: (ticker: string) =>
    request<void>(`/watchlist/${ticker}`, { method: "DELETE" }),

  analyze: (ticker: string, watchlist: string[]) => {
    const params = watchlist.map((t) => `watchlist=${t}`).join("&");
    return request<TickerAnalysis>(`/analysis/${ticker}${params ? "?" + params : ""}`);
  },

  importCsv: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ added: string[]; skipped: string[] }>("/import", {
      method: "POST",
      body: fd,
    });
  },
};
