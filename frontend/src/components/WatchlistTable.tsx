import { useState, useRef, useCallback } from "react";
import type { MouseEvent } from "react";
import type { TickerAnalysis } from "../api/client";
import ScoreBadge from "./ScoreBadge";
import MetricCell from "./MetricCell";

interface Props {
  rows: (TickerAnalysis | null)[];
  tickers: string[];
  loading: Record<string, boolean>;
  onRemove: (ticker: string) => void;
  onRefresh: (ticker: string) => void;
}

function fmt(n: number | null | undefined, decimals = 0) {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(decimals);
}

const RATING_LABEL: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  underperform: "Underperform",
  sell: "Sell",
};

function AnalystRatingCell({ ratingKey, rating }: { ratingKey: string | null; rating: number | null }) {
  if (!ratingKey && rating == null) return <span className="text-slate-300">—</span>;
  const label = ratingKey ? (RATING_LABEL[ratingKey] ?? ratingKey) : null;
  const colorClass =
    ratingKey === "strong_buy" || ratingKey === "buy"
      ? "text-emerald-700"
      : ratingKey === "hold"
      ? "text-yellow-700"
      : "text-red-600";
  return (
    <span className={`${colorClass} tabular-nums`}>
      {label ?? ""}
      {rating != null && <span className="text-slate-400 text-xs ml-1">({rating.toFixed(1)})</span>}
    </span>
  );
}

function ExpandedRow({ row }: { row: TickerAnalysis }) {
  const f = row.fundamental;
  const t = row.technical;
  const e = row.etf;
  const s = row.score;

  return (
    <div className="bg-slate-50 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
      {/* Fundamentals */}
      <div>
        <h4 className="font-semibold text-slate-600 mb-2 uppercase tracking-wide text-xs">
          Fundamental ({s.breakdown.fundamental?.toFixed(0)})
        </h4>
        <table className="w-full text-xs">
          <tbody>
            {[
              ["P/E (trail)", f.pe_trailing, "num"],
              ["P/E (fwd)", f.pe_forward, "num"],
              ["EPS (trail)", f.eps_trailing, "price"],
              ["EPS (fwd)", f.eps_forward, "price"],
              ["PEG", f.peg_ratio, "ratio"],
              ["Rev. Growth", f.revenue_growth_pct, "pct"],
              ["Profit Margin", f.profit_margin_pct, "pct"],
              ["Op. Margin", f.operating_margin_pct, "pct"],
              ["ROE", f.roe_pct, "pct"],
              ["Debt/Equity", f.debt_to_equity, "ratio"],
              ["Current Ratio", f.current_ratio, "ratio"],
              ["FCF/Share", f.fcf_per_share, "price"],
            ].map(([label, val, fmt_]) => (
              <tr key={label as string} className="border-b border-slate-100">
                <td className="py-0.5 text-slate-500 pr-4">{label}</td>
                <td className="py-0.5 font-mono text-right">
                  <MetricCell value={val as number} format={fmt_ as "pct" | "num" | "price" | "ratio"} />
                </td>
              </tr>
            ))}
            {/* Analyst block */}
            {(f.analyst_rating != null || f.analyst_count != null) && (
              <>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4 pt-2 font-semibold" colSpan={2}>Analyst consensus</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">Rating</td>
                  <td className="py-0.5 text-right">
                    <AnalystRatingCell ratingKey={f.analyst_rating_key} rating={f.analyst_rating} />
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4"># Analysts</td>
                  <td className="py-0.5 font-mono text-right">{f.analyst_count ?? "—"}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">Price target</td>
                  <td className="py-0.5 font-mono text-right">
                    <MetricCell value={f.analyst_target_price} format="price" />
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">Upside</td>
                  <td className="py-0.5 font-mono text-right">
                    <MetricCell value={f.analyst_upside_pct} format="pct" good="high" />
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Technical */}
      <div>
        <h4 className="font-semibold text-slate-600 mb-2 uppercase tracking-wide text-xs">
          Technical ({s.breakdown.technical?.toFixed(0)})
        </h4>
        <table className="w-full text-xs">
          <tbody>
            {[
              ["Price", t.current_price, "price"],
              ["SMA50", t.sma50, "price"],
              ["SMA200", t.sma200, "price"],
              ["vs SMA50", t.price_vs_sma50, "pct"],
              ["vs SMA200", t.price_vs_sma200, "pct"],
              ["RSI", t.rsi, "num"],
              ["Beta", t.beta, "ratio"],
              ["52wk Range %", t.week52_pct, "num"],
            ].map(([label, val, fmt_]) => (
              <tr key={label as string} className="border-b border-slate-100">
                <td className="py-0.5 text-slate-500 pr-4">{label}</td>
                <td className="py-0.5 font-mono text-right">
                  <MetricCell value={val as number} format={fmt_ as "pct" | "num" | "price" | "ratio"} />
                </td>
              </tr>
            ))}
            {t.macd && (
              <tr className="border-b border-slate-100">
                <td className="py-0.5 text-slate-500 pr-4">MACD hist</td>
                <td className="py-0.5 font-mono text-right">
                  <MetricCell value={t.macd.hist} format="ratio" good={t.macd.hist > 0 ? "high" : "low"} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ETF or Score breakdown */}
      <div>
        {e ? (
          <>
            <h4 className="font-semibold text-slate-600 mb-2 uppercase tracking-wide text-xs">
              ETF ({s.breakdown.etf?.toFixed(0)})
            </h4>
            <table className="w-full text-xs mb-3">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">Expense Ratio</td>
                  <td className="py-0.5 font-mono text-right">
                    {e.expense_ratio_pct != null ? `${e.expense_ratio_pct}%` : "—"}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">AUM</td>
                  <td className="py-0.5 font-mono text-right">{fmt(e.aum)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-0.5 text-slate-500 pr-4">Dividend Yield</td>
                  <td className="py-0.5 font-mono text-right">
                    {e.dividend_yield_pct != null ? `${e.dividend_yield_pct}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
            {e.top_holdings.length > 0 && (
              <>
                <p className="text-xs text-slate-500 font-semibold mb-1">Top Holdings</p>
                {e.top_holdings.slice(0, 5).map((h) => (
                  <div key={h.symbol} className="flex justify-between text-xs">
                    <span className="text-slate-600">{h.symbol}</span>
                    <span className="font-mono">{h.weight_pct}%</span>
                  </div>
                ))}
              </>
            )}
            {Object.keys(e.overlap).length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 font-semibold mb-1">Holdings Overlap</p>
                {Object.entries(e.overlap).map(([sym, pct]) => (
                  <div key={sym} className="flex justify-between text-xs">
                    <span className="text-slate-600">vs {sym}</span>
                    <span className="font-mono">{pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h4 className="font-semibold text-slate-600 mb-2 uppercase tracking-wide text-xs">Score Signals</h4>
            {Object.entries(s.signals).map(([dim, signals]) => (
              <div key={dim} className="mb-2">
                <p className="text-xs font-medium text-slate-500 capitalize">{dim}</p>
                {Object.entries(signals).map(([sig, val]) => (
                  <div key={sig} className="flex justify-between text-xs pl-2">
                    <span className="text-slate-500">{sig.replace(/_/g, " ")}</span>
                    <span className="font-mono">{(val * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

type SortKey =
  | "ticker" | "price" | "market_cap" | "score" | "moat" | "pe" | "rev_grw" | "rsi" | "mfi" | "short_pct" | "week52"
  | "margin" | "de" | "analyst" | "analyst_count" | "target";

type ColKey = SortKey | "expand" | "actions";

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  expand: 28, ticker: 150, price: 88, market_cap: 88, score: 98, moat: 72,
  pe: 60, rev_grw: 72, rsi: 52, mfi: 52, short_pct: 68, week52: 68,
  margin: 68, de: 56, analyst: 88, analyst_count: 58,
  target: 62, actions: 64,
};

function getVal(key: SortKey, ticker: string, row: TickerAnalysis | null): number | string | null {
  if (key === "ticker") return ticker;
  if (!row) return null;
  switch (key) {
    case "price":        return row.technical.current_price ?? null;
    case "market_cap":   return row.fundamental.market_cap ?? null;
    case "score":        return row.score.score;
    case "moat":         return row.fundamental.moat_score ?? null;
    case "pe":           return row.fundamental.pe_trailing ?? null;
    case "rev_grw":      return row.fundamental.revenue_growth_pct ?? null;
    case "rsi":          return row.technical.rsi ?? null;
    case "mfi":          return row.technical.mfi ?? null;
    case "short_pct":    return row.technical.short_pct ?? null;
    case "week52":       return row.technical.week52_pct ?? null;
    case "margin":       return row.fundamental.profit_margin_pct ?? null;
    case "de":           return row.fundamental.debt_to_equity ?? null;
    case "analyst":      return row.fundamental.analyst_rating ?? null;
    case "analyst_count":return row.fundamental.analyst_count ?? null;
    case "target":       return row.fundamental.analyst_upside_pct ?? null;
  }
}

function MoatCell({ label }: { label: string | null | undefined }) {
  if (!label) return <span className="text-slate-300">—</span>;
  const color = label === "Wide" ? "text-emerald-700" : label === "Narrow" ? "text-yellow-700" : "text-slate-400";
  return <span className={`font-medium ${color}`}>{label}</span>;
}

export default function WatchlistTable({ rows, tickers, loading, onRemove, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>({ ...DEFAULT_WIDTHS });
  const resizingRef = useRef<{ colKey: ColKey; startX: number; startWidth: number } | null>(null);
  const stockTickers = tickers.filter((t) => {
    const row = rows.find((r) => r?.ticker === t);
    return row == null || row.etf == null;
  });

  const startResize = useCallback((colKey: ColKey, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    resizingRef.current = { colKey, startX: e.clientX, startWidth: th.offsetWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: globalThis.MouseEvent) => {
      if (!resizingRef.current) return;
      const newWidth = Math.max(40, resizingRef.current.startWidth + ev.clientX - resizingRef.current.startX);
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.colKey]: newWidth }));
    };
    const onUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const showTooltip = (e: MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left, y: rect.bottom + 6 });
  };
  const hideTooltip = () => setTooltip(null);

  const toggle = (ticker: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedTickers = [...stockTickers].sort((a, b) => {
    if (!sortKey) return 0;
    const rowA = rows.find((r) => r?.ticker === a) ?? null;
    const rowB = rows.find((r) => r?.ticker === b) ?? null;
    const va = getVal(sortKey, a, rowA);
    const vb = getVal(sortKey, b, rowB);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string")
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const Th = ({
    label, colKey, align = "right", title,
  }: { label: string; colKey: SortKey; align?: "left" | "right"; title?: string }) => {
    const active = sortKey === colKey;
    return (
      <th
        className={`relative px-4 py-2 text-${align} cursor-pointer select-none group whitespace-nowrap overflow-hidden`}
        onClick={() => handleSort(colKey)}
        onMouseEnter={title ? (e) => showTooltip(e, title) : undefined}
        onMouseLeave={title ? hideTooltip : undefined}
      >
        <span className={active ? "text-slate-700" : ""}>{label}</span>
        <span className={`ml-1 ${active ? "text-slate-600" : "text-slate-300 group-hover:text-slate-400"}`}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => startResize(colKey, e)}
        />
      </th>
    );
  };

  if (stockTickers.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        {tickers.length === 0
          ? "Add tickers above to get started."
          : "No stocks in your watchlist — all tickers are ETFs."}
      </div>
    );
  }

  const totalCols = 15;

  return (
    <>
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="table-fixed text-sm">
        <colgroup>
          <col style={{ width: colWidths.expand }} />
          <col style={{ width: colWidths.ticker }} />
          <col style={{ width: colWidths.price }} />
          <col style={{ width: colWidths.market_cap }} />
          <col style={{ width: colWidths.score }} />
          <col style={{ width: colWidths.moat }} />
          <col style={{ width: colWidths.pe }} />
          <col style={{ width: colWidths.rev_grw }} />
          <col style={{ width: colWidths.rsi }} />
          <col style={{ width: colWidths.mfi }} />
          <col style={{ width: colWidths.short_pct }} />
          <col style={{ width: colWidths.week52 }} />
          <col style={{ width: colWidths.margin }} />
          <col style={{ width: colWidths.de }} />
          <col style={{ width: colWidths.analyst }} />
          <col style={{ width: colWidths.analyst_count }} />
          <col style={{ width: colWidths.target }} />
          <col style={{ width: colWidths.actions }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wide">
            <th className="relative px-2 py-2 text-left group">
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => startResize("expand", e)}
              />
            </th>
            <Th label="Ticker" colKey="ticker" align="left"
              title="Stock or ETF ticker symbol" />
            <Th label="Last Close" colKey="price"
              title="Most recent closing price" />
            <Th label="Mkt Cap" colKey="market_cap"
              title="Market capitalisation (shares outstanding × price).&#10;Displayed as B (billions) or M (millions)." />
            <Th label="Score" colKey="score" align="left"
              title="Composite 0–100 score.&#10;Stocks: 55% Fundamental + 45% Technical&#10;ETFs: 40% Fundamental + 35% Technical + 25% ETF-specific&#10;BUY ≥ 65 · HOLD 40–64 · AVOID < 40" />
            <Th label="Moat" colKey="moat" align="left"
              title="Economic moat estimate based on 5 signals:&#10;gross margin > 40%, operating margin > 20%, ROE > 20%, D/E < 50, FCF > 0&#10;Wide = 4–5 signals · Narrow = 2–3 · None = 0–1&#10;Display only — does not feed the composite score." />
            <Th label="P/E" colKey="pe"
              title="Trailing price-to-earnings ratio.&#10;< 15 strong · 15–25 good · 25–40 fair · > 40 weak&#10;Negative or missing = no earnings" />
            <Th label="Rev Grw" colKey="rev_grw"
              title="Year-over-year revenue growth.&#10;> 20% strong · 10–20% good · 0–10% fair · negative weak" />
            <Th label="RSI" colKey="rsi"
              title="Relative Strength Index (14-day).&#10;Measures momentum from recent price changes.&#10;< 30 oversold · 30–45 recovery · 45–60 neutral · > 70 overbought" />
            <Th label="MFI" colKey="mfi"
              title="Money Flow Index (14-day). Volume-weighted RSI.&#10;Formula: 100 − 100 / (1 + positive MF / negative MF)&#10;< 20 oversold (bullish) · 20–40 good · 40–60 neutral · 60–80 fair · > 80 overbought (bearish)&#10;Feeds the composite score." />
            <Th label="Short %" colKey="short_pct"
              title="Short interest as a percentage of float.&#10;High values (> 20%) signal bearish sentiment or short-squeeze potential.&#10;Display only — does not feed the composite score." />
            <Th label="52wk%" colKey="week52"
              title="Where the current price sits in the 52-week high/low range.&#10;Formula: (price − 52w low) / (52w high − 52w low) × 100&#10;Example: low $80, high $120, price $100 → (100−80)/(120−80)×100 = 50%&#10;40–80% healthy · near 0% bearish · near 100% may be overextended" />
            <Th label="Margin" colKey="margin"
              title="Net profit margin (net income / revenue).&#10;> 20% strong · 10–20% good · 0–10% fair · negative weak" />
            <Th label="D/E" colKey="de"
              title="Debt-to-equity ratio (total debt / shareholders' equity).&#10;Lower is generally safer.&#10;< 50 strong · 50–150 fair · 150–300 weak · > 300 poor" />
            <Th label="Analyst" colKey="analyst"
              title="Average analyst rating (1.0 = Strong Buy → 5.0 = Sell).&#10;Display only — does not feed the composite score." />
            <Th label="# Ana." colKey="analyst_count"
              title="Number of analysts covering this ticker.&#10;Higher count = more reliable consensus." />
            <Th label="Target" colKey="target"
              title="% upside to analysts' mean price target.&#10;Formula: (mean target / current price − 1) × 100&#10;Display only — does not feed the composite score." />
            <th className="relative px-4 py-2 text-right group">Actions
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => startResize("actions", e)}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTickers.map((ticker) => {
            const row = rows.find((r) => r?.ticker === ticker) ?? null;
            const isLoading = loading[ticker];
            const isExpanded = expanded.has(ticker);

            return (
              <>
                <tr
                  key={ticker}
                  className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${isExpanded ? "bg-slate-50" : ""}`}
                  onClick={() => row && toggle(ticker)}
                >
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {row ? (isExpanded ? "▼" : "▶") : ""}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {ticker}
                    {row?.name && (
                      <div className="text-xs font-normal text-slate-400 truncate max-w-[160px]">
                        {row.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.technical.current_price} format="price" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {row?.fundamental.market_cap != null
                      ? fmt(row.fundamental.market_cap)
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isLoading ? (
                      <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
                    ) : row ? (
                      <ScoreBadge score={row.score.score} verdict={row.score.verdict} />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <MoatCell label={row?.fundamental.moat_label} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.pe_trailing} format="num" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.revenue_growth_pct} format="pct" good="high" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.technical.rsi} format="num" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.technical.mfi} format="num" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.technical.short_pct} format="num" suffix="%" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.technical.week52_pct} format="num" suffix="%" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.profit_margin_pct} format="pct" good="high" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.debt_to_equity} format="ratio" />
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {row ? (
                      <AnalystRatingCell
                        ratingKey={row.fundamental.analyst_rating_key}
                        rating={row.fundamental.analyst_rating}
                      />
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {row?.fundamental.analyst_count ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {row?.fundamental.analyst_upside_pct != null ? (
                      <MetricCell value={row.fundamental.analyst_upside_pct} format="pct" good="high" />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                      onClick={() => onRefresh(ticker)}
                    >
                      ↻
                    </button>
                    <button
                      className="text-xs text-slate-400 hover:text-red-500"
                      onClick={() => onRemove(ticker)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
                {isExpanded && row && (
                  <tr key={`${ticker}-expanded`} className="border-t border-slate-100">
                    <td colSpan={totalCols} className="p-0">
                      <ExpandedRow row={row} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
    {tooltip && (
      <div
        className="fixed z-50 max-w-xs rounded-lg bg-slate-800 text-white text-xs px-3 py-2 shadow-xl pointer-events-none leading-relaxed"
        style={{ left: tooltip.x, top: tooltip.y }}
      >
        {tooltip.text.split("\n").map((line, i) => (
          <div key={i} className={i > 0 ? "mt-1" : ""}>{line}</div>
        ))}
      </div>
    )}
    <p className="mt-2 text-xs text-slate-400">
      * <strong>Score</strong> = 55% Fundamental + 45% Technical · BUY ≥ 65 · HOLD 40–64 · AVOID &lt; 40 ·{" "}
      <strong>MFI</strong> = 14-day Money Flow Index (volume-weighted RSI; &gt;80 overbought, &lt;20 oversold)
    </p>
    </>
  );
}
