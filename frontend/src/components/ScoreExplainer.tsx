import { useState } from "react";

export default function ScoreExplainer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-300 w-6 h-6 text-xs text-slate-500 hover:bg-slate-100 leading-none flex items-center justify-center"
        title="How scores work"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">How the score works</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Each ticker gets a <strong>0–100 composite score</strong> built from up to three
              dimensions. The score maps to a verdict: <span className="text-emerald-700 font-semibold">BUY</span> ≥ 65 ·{" "}
              <span className="text-yellow-700 font-semibold">HOLD</span> 40–64 ·{" "}
              <span className="text-red-600 font-semibold">AVOID</span> &lt; 40.
            </p>

            {/* Weights */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Dimension weights</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b">
                    <th className="text-left py-1">Dimension</th>
                    <th className="text-right py-1">Stock</th>
                    <th className="text-right py-1">ETF</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-50">
                    <td className="py-1.5">Fundamental</td>
                    <td className="text-right">55%</td>
                    <td className="text-right">40%</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-1.5">Technical</td>
                    <td className="text-right">45%</td>
                    <td className="text-right">35%</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">ETF-specific</td>
                    <td className="text-right text-slate-300">—</td>
                    <td className="text-right">25%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fundamental signals */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Fundamental signals</h3>
              <div className="space-y-1.5 text-sm text-slate-600">
                <div><span className="font-medium">P/E ratio</span> — &lt;15 strong, 15–25 good, 25–40 fair, &gt;40 weak</div>
                <div><span className="font-medium">Revenue growth</span> — &gt;20% strong, 10–20% good, 0–10% fair, negative weak</div>
                <div><span className="font-medium">Profit margin</span> — &gt;20% strong, 10–20% good, 0–10% fair, negative weak</div>
                <div><span className="font-medium">Debt/equity</span> — &lt;50 strong, 50–150 fair, 150–300 weak, &gt;300 poor</div>
                <div><span className="font-medium">ROE</span> — &gt;20% strong, 10–20% good, 0–10% fair, negative weak</div>
              </div>
            </div>

            {/* Technical signals */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Technical signals</h3>
              <div className="space-y-1.5 text-sm text-slate-600">
                <div><span className="font-medium">RSI (14d)</span> — 30–45 strong (oversold recovery), 45–60 neutral, &gt;70 weak (overbought)</div>
                <div><span className="font-medium">Price vs SMA50</span> — within −5% to +10% of 50-day MA is healthy; far below is bearish</div>
                <div><span className="font-medium">Price vs SMA200</span> — above 200-day MA (golden cross) is bullish</div>
                <div><span className="font-medium">MACD histogram</span> — positive = bullish momentum, negative = bearish</div>
                <div><span className="font-medium">MFI (14d)</span> — Money Flow Index: volume-weighted RSI using typical price × volume over 14 days. &lt;20 strong (oversold), 20–40 good, 40–60 neutral, 60–80 fair, &gt;80 weak (overbought)</div>
                <div><span className="font-medium">Short %</span> — short interest as a percentage of float. High short % (&gt;20%) can signal bearish sentiment or squeeze potential. Display-only — does not feed the composite score</div>
                <div><span className="font-medium">52-week range (52wk%)</span> — position within the 52-week high/low range: <code className="text-xs bg-slate-100 px-1 rounded">(price − 52w low) / (52w high − 52w low) × 100</code>. 40–80% is healthy; near 0% is bearish momentum, near 100% may signal overextension</div>
              </div>
            </div>

            {/* ETF signals */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">ETF-specific signals</h3>
              <div className="space-y-1.5 text-sm text-slate-600">
                <div><span className="font-medium">Expense ratio</span> — &lt;0.1% strong, 0.1–0.3% good, 0.3–0.75% fair, &gt;0.75% weak</div>
                <div><span className="font-medium">Dividend yield</span> — &gt;3% strong, 1–3% good, &lt;1% neutral</div>
              </div>
            </div>

            {/* Analyst */}
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Analyst data (display only)</h3>
              <p className="text-sm text-slate-600">
                Analyst rating, count, and price target are shown as additional context but{" "}
                <strong>do not feed into the composite score</strong>. Rating scale: 1.0 = Strong Buy → 5.0 = Sell.
              </p>
            </div>

            <p className="text-xs text-slate-400 mt-4 pt-4 border-t">
              Each dimension score is the mean of its signal scores (0–1 scale, ×100). Signals
              with missing data are omitted from the average rather than penalised. Expand any row
              to see per-signal breakdowns.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
