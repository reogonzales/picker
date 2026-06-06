import { useState } from "react";
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

export default function WatchlistTable({ rows, tickers, loading, onRemove, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const hasEtf = rows.some((r) => r?.etf != null);

  const toggle = (ticker: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  if (tickers.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        Add tickers above to get started.
      </div>
    );
  }

  const totalCols = 11 + (hasEtf ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-2 text-left w-8"></th>
            <th className="px-4 py-2 text-left">Ticker</th>
            <th className="px-4 py-2 text-left">Score</th>
            <th className="px-4 py-2 text-right">P/E</th>
            <th className="px-4 py-2 text-right">Rev Grw</th>
            <th className="px-4 py-2 text-right">RSI</th>
            <th className="px-4 py-2 text-right">52wk%</th>
            <th className="px-4 py-2 text-right">Margin</th>
            <th className="px-4 py-2 text-right">D/E</th>
            {hasEtf && <th className="px-4 py-2 text-right">Exp. Ratio</th>}
            <th className="px-4 py-2 text-right">Analyst</th>
            <th className="px-4 py-2 text-right"># Ana.</th>
            <th className="px-4 py-2 text-right">Target</th>
            <th className="px-4 py-2 text-right w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((ticker) => {
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {isLoading ? (
                      <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
                    ) : row ? (
                      <ScoreBadge score={row.score.score} verdict={row.score.verdict} />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
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
                    <MetricCell value={row?.technical.week52_pct} format="num" suffix="%" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.profit_margin_pct} format="pct" good="high" />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <MetricCell value={row?.fundamental.debt_to_equity} format="ratio" />
                  </td>
                  {hasEtf && (
                    <td className="px-4 py-3 text-right font-mono">
                      {row?.etf?.expense_ratio_pct != null
                        ? `${row.etf.expense_ratio_pct}%`
                        : <span className="text-slate-300">—</span>}
                    </td>
                  )}
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
  );
}
