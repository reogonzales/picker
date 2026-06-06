import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import type { TickerAnalysis } from "./api/client";
import WatchlistTable from "./components/WatchlistTable";
import TickerSearch from "./components/TickerSearch";
import ImportModal from "./components/ImportModal";

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

  const handleAdd = async (ticker: string) => {
    await api.addTicker(ticker);
    const next = [...tickers, ticker];
    setTickers(next);
    fetchAnalysis(ticker, next);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight mr-4">Picker</h1>
        <TickerSearch onAdd={handleAdd} />
        <button
          onClick={() => setShowImport(true)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Import CSV
        </button>
        <button
          onClick={handleRefreshAll}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 ml-auto"
        >
          ↻ Refresh All
        </button>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
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
