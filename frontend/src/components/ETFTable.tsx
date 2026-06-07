import { useState, useRef, useCallback } from "react";
import type { MouseEvent } from "react";
import type { TickerAnalysis } from "../api/client";
import ScoreBadge from "./ScoreBadge";

interface Props {
  rows: (TickerAnalysis | null)[];
  tickers: string[];
  loading: Record<string, boolean>;
  onRemove: (ticker: string) => void;
  onRefresh: (ticker: string) => void;
}

function fmt(n: number | null | undefined, decimals = 1) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return n.toFixed(decimals);
}

function PerfCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-slate-300">—</span>;
  const color = value > 0 ? "text-emerald-700" : value < 0 ? "text-red-600" : "text-slate-500";
  return <span className={`${color} tabular-nums`}>{value > 0 ? "+" : ""}{value.toFixed(2)}%</span>;
}

type SortKey =
  | "ticker" | "price" | "score" | "ytd" | "mtd" | "qtd"
  | "perf_1y" | "perf_3y" | "perf_5y" | "since_inception"
  | "exp_ratio" | "aum" | "div_yield" | "mfi" | "num_holdings" | "beta_3y";

type ColKey = SortKey | "actions";

const DEFAULT_WIDTHS: Record<ColKey, number> = {
  ticker: 155, price: 82, score: 95, ytd: 72, mtd: 72, qtd: 72,
  perf_1y: 72, perf_3y: 80, perf_5y: 80, since_inception: 88,
  exp_ratio: 78, aum: 82, div_yield: 72, mfi: 52, num_holdings: 68,
  beta_3y: 62, actions: 60,
};

function getVal(key: SortKey, ticker: string, row: TickerAnalysis | null): number | string | null {
  if (key === "ticker") return ticker;
  if (!row) return null;
  const e = row.etf;
  switch (key) {
    case "price":          return row.technical.current_price ?? null;
    case "score":          return row.score.score;
    case "ytd":            return e?.ytd_pct ?? null;
    case "mtd":            return e?.mtd_pct ?? null;
    case "qtd":            return e?.qtd_pct ?? null;
    case "perf_1y":        return e?.perf_1y_pct ?? null;
    case "perf_3y":        return e?.perf_3y_pct ?? null;
    case "perf_5y":        return e?.perf_5y_pct ?? null;
    case "since_inception":return e?.since_inception_pct ?? null;
    case "exp_ratio":      return e?.expense_ratio_pct ?? null;
    case "aum":            return e?.aum ?? null;
    case "div_yield":      return e?.dividend_yield_pct ?? null;
    case "mfi":            return row.technical.mfi ?? null;
    case "num_holdings":   return e?.num_holdings ?? null;
    case "beta_3y":        return e?.beta_3y ?? null;
  }
}

export default function ETFTable({ rows, tickers, loading, onRemove, onRefresh }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>({ ...DEFAULT_WIDTHS });
  const resizingRef = useRef<{ colKey: ColKey; startX: number; startWidth: number } | null>(null);

  const etfTickers = tickers.filter((t) => {
    const row = rows.find((r) => r?.ticker === t);
    return row?.etf != null;
  });

  const showTooltip = (e: MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left, y: rect.bottom + 6 });
  };
  const hideTooltip = () => setTooltip(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const startResize = useCallback((colKey: ColKey, e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const th = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    resizingRef.current = { colKey, startX: e.clientX, startWidth: th.offsetWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: globalThis.MouseEvent) => {
      if (!resizingRef.current) return;
      const w = Math.max(40, resizingRef.current.startWidth + ev.clientX - resizingRef.current.startX);
      setColWidths((prev) => ({ ...prev, [resizingRef.current!.colKey]: w }));
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

  const sortedTickers = [...etfTickers].sort((a, b) => {
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
        className={`relative px-3 py-2 text-${align} cursor-pointer select-none group whitespace-nowrap overflow-hidden`}
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

  if (etfTickers.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        No ETFs in your watchlist. Add ETF tickers above.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="table-fixed text-sm">
        <colgroup>
          <col style={{ width: colWidths.ticker }} />
          <col style={{ width: colWidths.price }} />
          <col style={{ width: colWidths.score }} />
          <col style={{ width: colWidths.ytd }} />
          <col style={{ width: colWidths.mtd }} />
          <col style={{ width: colWidths.qtd }} />
          <col style={{ width: colWidths.perf_1y }} />
          <col style={{ width: colWidths.perf_3y }} />
          <col style={{ width: colWidths.perf_5y }} />
          <col style={{ width: colWidths.since_inception }} />
          <col style={{ width: colWidths.exp_ratio }} />
          <col style={{ width: colWidths.aum }} />
          <col style={{ width: colWidths.div_yield }} />
          <col style={{ width: colWidths.mfi }} />
          <col style={{ width: colWidths.num_holdings }} />
          <col style={{ width: colWidths.beta_3y }} />
          <col style={{ width: colWidths.actions }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wide">
            <Th label="Ticker" colKey="ticker" align="left" title="ETF ticker symbol" />
            <Th label="Price" colKey="price" title="Most recent closing price" />
            <Th label="Score" colKey="score" align="left"
              title="Composite 0–100 score.&#10;ETFs: 40% Fundamental + 35% Technical + 25% ETF-specific&#10;BUY ≥ 65 · HOLD 40–64 · AVOID < 40" />
            <Th label="YTD" colKey="ytd"
              title="Year-to-date return (Jan 1 to today)" />
            <Th label="MTD" colKey="mtd"
              title="Month-to-date return (1st of this month to today)" />
            <Th label="QTD" colKey="qtd"
              title="Quarter-to-date return (1st of current quarter to today)" />
            <Th label="1Y" colKey="perf_1y"
              title="Total return over the past 12 months" />
            <Th label="3Y ann." colKey="perf_3y"
              title="Annualized return over the past 3 years&#10;Formula: (end/start)^(1/years) − 1" />
            <Th label="5Y ann." colKey="perf_5y"
              title="Annualized return over the past 5 years&#10;Formula: (end/start)^(1/years) − 1" />
            <Th label="Inception" colKey="since_inception"
              title="Total return since fund inception date" />
            <Th label="Exp. Ratio" colKey="exp_ratio"
              title="Annual expense ratio — fund operating cost as % of assets.&#10;< 0.1% strong · 0.1–0.3% good · 0.3–0.75% fair · > 0.75% weak" />
            <Th label="AUM" colKey="aum"
              title="Assets under management" />
            <Th label="Div. Yield" colKey="div_yield"
              title="Annual dividend yield" />
            <Th label="MFI" colKey="mfi"
              title="14-day Money Flow Index (volume-weighted RSI).&#10;< 20 oversold · > 80 overbought" />
            <Th label="# Holdings" colKey="num_holdings"
              title="Number of holdings in the ETF (top 10 shown)" />
            <Th label="Beta 3Y" colKey="beta_3y"
              title="3-year beta relative to benchmark.&#10;< 1 = less volatile than market · > 1 = more volatile" />
            <th className="relative px-3 py-2 text-right group">Actions
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
            const e = row?.etf;

            return (
              <tr key={ticker} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-800">
                  {ticker}
                  {row?.name && (
                    <div className="text-xs font-normal text-slate-400 truncate">{row.name}</div>
                  )}
                  {e?.category && (
                    <div className="text-xs font-normal text-slate-400 truncate">{e.category}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {row?.technical.current_price != null
                    ? `$${row.technical.current_price.toFixed(2)}`
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  {isLoading
                    ? <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
                    : row
                    ? <ScoreBadge score={row.score.score} verdict={row.score.verdict} />
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.ytd_pct} /></td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.mtd_pct} /></td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.qtd_pct} /></td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.perf_1y_pct} /></td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.perf_3y_pct} /></td>
                <td className="px-3 py-2 text-right"><PerfCell value={e?.perf_5y_pct} /></td>
                <td className="px-3 py-2 text-right">
                  <div><PerfCell value={e?.since_inception_pct} /></div>
                  {e?.inception_date && (
                    <div className="text-xs text-slate-400">{e.inception_date}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {e?.expense_ratio_pct != null ? `${e.expense_ratio_pct}%` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{fmt(e?.aum)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">
                  {e?.dividend_yield_pct != null ? `${e.dividend_yield_pct}%` : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {row?.technical.mfi ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {e?.num_holdings ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">
                  {e?.beta_3y != null ? e.beta_3y.toFixed(2) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                    onClick={() => onRefresh(ticker)}
                  >↻</button>
                  <button
                    className="text-xs text-slate-400 hover:text-red-500"
                    onClick={() => onRemove(ticker)}
                  >×</button>
                </td>
              </tr>
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
      * Performance periods: YTD/MTD/QTD = calendar periods · 1Y = total return · 3Y/5Y = annualized · Inception = total since fund launch.
      Score = 40% Fundamental + 35% Technical + 25% ETF-specific.
    </p>
    </>
  );
}
