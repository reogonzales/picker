import { useState } from "react";

interface Props {
  onAdd: (tickers: string[]) => Promise<void>;
}

export default function TickerSearch({ onAdd }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const tickers = value
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    if (!tickers.length) return;
    setLoading(true);
    setError(null);
    try {
      await onAdd(tickers);
      setValue("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 uppercase placeholder:normal-case placeholder:text-slate-400"
        placeholder="AAPL, VOO, NVDA…"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={loading}
      />
      <button
        onClick={submit}
        disabled={loading || !value.trim()}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {loading ? "Adding…" : "+ Add"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
