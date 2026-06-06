import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import type { TickerAnalysis } from "./api/client";
import WatchlistTable from "./components/WatchlistTable";
import TickerSearch from "./components/TickerSearch";
import ImportModal from "./components/ImportModal";
import ScoreExplainer from "./components/ScoreExplainer";

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-800 px-4 py-3 text-sm text-white shadow-lg flex items-center gap-3">
      {message}
      <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
    </div>
  );
}

export default function App() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, TickerAnalysis>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [font, setFont] = useState<string>(() => localStorage.getItem("picker-font") ?? "system");
  const [fontSize, setFontSize] = useState<string>(() => localStorage.getItem("picker-font-size") ?? "70");
  const abortRefs = useRef<Record<string, AbortController>>({});

  const showToast = (msg: string) => setToast(msg);

  const fetchAnalysis = useCallback(async (ticker: string, allTickers: string[]) => {
    abortRefs.current[ticker]?.abort();
    const ac = new AbortController();
    abortRefs.current[ticker] = ac;
    setLoadingMap((m) => ({ ...m, [ticker]: true }));
    try {
      const result = await api.analyze(ticker, allTickers.filter((t) => t !== ticker));
      setAnalyses((prev) => ({ ...prev, [ticker]: result }));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        showToast(`Failed to load ${ticker}: ${(e as Error).message}`);
      }
    } finally {
      setLoadingMap((m) => ({ ...m, [ticker]: false }));
    }
  }, []);

  useEffect(() => {
    api.getWatchlist().then((entries) => {
      const ts = entries.map((e) => e.ticker);
      setTickers(ts);
      ts.forEach((t) => fetchAnalysis(t, ts));
    }).catch(() => showToast("Could not reach backend. Is it running on port 8000?"));
  }, [fetchAnalysis]);

  const handleAdd = async (incoming: string[]) => {
    const deduped = incoming.filter((t) => !tickers.includes(t));
    if (!deduped.length) return;
    await Promise.all(deduped.map((t) => api.addTicker(t)));
    const next = [...tickers, ...deduped];
    setTickers(next);
    deduped.forEach((t) => fetchAnalysis(t, next));
  };

  const handleRemove = async (ticker: string) => {
    await api.removeTicker(ticker);
    abortRefs.current[ticker]?.abort();
    setTickers((ts) => ts.filter((t) => t !== ticker));
    setAnalyses((prev) => {
      const next = { ...prev };
      delete next[ticker];
      return next;
    });
  };

  const handleRefresh = (ticker: string) => {
    fetchAnalysis(ticker, tickers);
  };

  const handleRefreshAll = () => {
    tickers.forEach((t) => fetchAnalysis(t, tickers));
  };

  const handleImported = (added: string[]) => {
    const next = [...tickers, ...added];
    setTickers(next);
    added.forEach((t) => fetchAnalysis(t, next));
    showToast(`Imported ${added.length} ticker${added.length !== 1 ? "s" : ""}`);
  };

  const rows = tickers.map((t) => analyses[t] ?? null);

  const FONTS: Record<string, string> = {
    system: "system-ui, -apple-system, sans-serif",
    inter: "'Inter', sans-serif",
    lato: "'Lato', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  };

  const handleFontChange = (f: string) => {
    setFont(f);
    localStorage.setItem("picker-font", f);
  };

  const handleFontSizeChange = (s: string) => {
    setFontSize(s);
    localStorage.setItem("picker-font-size", s);
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: FONTS[font] ?? FONTS.system, fontSize: `${fontSize}%` }}>
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex flex-col leading-tight mr-1">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Picker</h1>
          <span className="text-xs text-slate-400">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <ScoreExplainer />
        <TickerSearch onAdd={handleAdd} />
        <button
          onClick={() => setShowImport(true)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Import CSV
        </button>
        <select
          value={font}
          onChange={(e) => handleFontChange(e.target.value)}
          className="ml-auto rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-600 bg-white hover:bg-slate-50 focus:outline-none"
          title="Font family"
        >
          <option value="system">System font</option>
          <option value="inter">Inter</option>
          <option value="lato">Lato</option>
          <option value="mono">Monospace</option>
        </select>
        <select
          value={fontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-600 bg-white hover:bg-slate-50 focus:outline-none"
          title="Font size"
        >
          <option value="55">55%</option>
          <option value="65">65%</option>
          <option value="70">70%</option>
          <option value="80">80%</option>
          <option value="90">90%</option>
          <option value="100">100%</option>
        </select>
        <button
          onClick={handleRefreshAll}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          ↻ Refresh All
        </button>
      </header>

      <main className="px-6 py-6">
        <WatchlistTable
          rows={rows}
          tickers={tickers}
          loading={loadingMap}
          onRemove={handleRemove}
          onRefresh={handleRefresh}
        />
      </main>

      {showImport && (
        <ImportModal
          onImported={handleImported}
          onClose={() => setShowImport(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
